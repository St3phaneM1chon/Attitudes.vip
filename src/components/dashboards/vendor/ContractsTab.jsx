/**
 * ContractsTab - Gestion des contrats pour les vendors
 * Création, signature, suivi et gestion des contrats
 */

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../../hooks/useSupabase';
import { useWebSocket } from '../../../hooks/useWebSocketOptimized';
import { formatCurrency, formatDate } from '../../../utils/format';
import { ContractEditor } from '../../contracts/ContractEditor';
import { ContractViewer } from '../../contracts/ContractViewer';
import { SignatureModal } from '../../contracts/SignatureModal';

export default function ContractsTab({ vendor }) {
  const { supabase } = useSupabase();
  const { subscribe } = useWebSocket();
  
  const [contracts, setContracts] = useState([]);
  const [filteredContracts, setFilteredContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  
  // Filtres
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    dateRange: 'all'
  });
  
  // Statistiques
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    signed: 0,
    completed: 0,
    totalValue: 0
  });

  useEffect(() => {
    loadContracts();
    
    // S'abonner aux mises à jour temps réel
    const unsubscribe = subscribe(`vendor:${vendor.id}:contracts`, (message) => {
      if (message.type === 'contract_update') {
        updateContract(message.data);
      } else if (message.type === 'contract_signed') {
        handleContractSigned(message.data);
      }
    });
    
    return () => unsubscribe();
  }, [vendor.id]);

  useEffect(() => {
    applyFilters();
  }, [contracts, filters]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          wedding:weddings(id, name, date),
          customer:customers(
            id,
            user:users(name, email)
          ),
          payments:payments(
            id,
            amount,
            status,
            due_date
          )
        `)
        .eq('vendor_id', vendor.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setContracts(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (contractsData) => {
    const stats = contractsData.reduce((acc, contract) => {
      acc.total++;
      acc[contract.status] = (acc[contract.status] || 0) + 1;
      acc.totalValue += contract.total_amount || 0;
      return acc;
    }, {
      total: 0,
      draft: 0,
      pending: 0,
      signed: 0,
      completed: 0,
      totalValue: 0
    });
    
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...contracts];
    
    // Filtre par statut
    if (filters.status !== 'all') {
      filtered = filtered.filter(c => c.status === filters.status);
    }
    
    // Filtre par recherche
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.wedding?.name.toLowerCase().includes(search) ||
        c.customer?.user?.name.toLowerCase().includes(search) ||
        c.contract_number?.toLowerCase().includes(search)
      );
    }
    
    // Filtre par date
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      
      switch (filters.dateRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(c => 
        new Date(c.created_at) >= startDate
      );
    }
    
    setFilteredContracts(filtered);
  };

  const updateContract = (contractData) => {
    setContracts(prev => 
      prev.map(c => c.id === contractData.id ? { ...c, ...contractData } : c)
    );
  };

  const handleContractSigned = (contractData) => {
    updateContract(contractData);
    // Notification ou autre action
  };

  const createContract = async (contractData) => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          ...contractData,
          vendor_id: vendor.id,
          status: 'draft',
          version: 1
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setContracts(prev => [data, ...prev]);
      setSelectedContract(data);
      setIsCreating(false);
      
      return data;
    } catch (error) {
      console.error('Error creating contract:', error);
      throw error;
    }
  };

  const updateContractStatus = async (contractId, newStatus) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ 
          status: newStatus,
          [`${newStatus}_at`]: new Date().toISOString()
        })
        .eq('id', contractId);
      
      if (error) throw error;
      
      updateContract({ id: contractId, status: newStatus });
    } catch (error) {
      console.error('Error updating contract status:', error);
    }
  };

  const sendContract = async (contractId) => {
    try {
      // Envoyer le contrat au client
      const contract = contracts.find(c => c.id === contractId);
      
      const { error } = await supabase
        .from('contract_notifications')
        .insert({
          contract_id: contractId,
          recipient_id: contract.customer.user.id,
          type: 'contract_sent',
          sent_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Mettre à jour le statut
      await updateContractStatus(contractId, 'pending');
      
      // Notification de succès
      alert('Contrat envoyé avec succès');
    } catch (error) {
      console.error('Error sending contract:', error);
    }
  };

  const duplicateContract = async (contractId) => {
    try {
      const original = contracts.find(c => c.id === contractId);
      
      const newContract = {
        ...original,
        id: undefined,
        contract_number: `${original.contract_number}-COPY`,
        status: 'draft',
        created_at: undefined,
        updated_at: undefined,
        signed_at: undefined
      };
      
      const created = await createContract(newContract);
      setSelectedContract(created);
    } catch (error) {
      console.error('Error duplicating contract:', error);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: 'edit' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'clock' },
      signed: { bg: 'bg-green-100', text: 'text-green-800', icon: 'check-circle' },
      completed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'check-double' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: 'times-circle' }
    };
    
    const style = styles[status] || styles.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <i className={`fas fa-${style.icon} mr-1`} />
        {status}
      </span>
    );
  };

  const getPaymentStatus = (payments) => {
    if (!payments || payments.length === 0) return null;
    
    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    const paid = payments.filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const percentage = Math.round((paid / total) * 100);
    
    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span>Paiements</span>
          <span>{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="bg-green-600 h-1.5 rounded-full" 
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="bg-gray-200 h-32 rounded-lg mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <i className="fas fa-file-contract text-3xl text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Brouillons</p>
              <p className="text-2xl font-bold">{stats.draft}</p>
            </div>
            <i className="fas fa-edit text-3xl text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En attente</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
            <i className="fas fa-clock text-3xl text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Signés</p>
              <p className="text-2xl font-bold">{stats.signed}</p>
            </div>
            <i className="fas fa-check-circle text-3xl text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Valeur totale</p>
              <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
            </div>
            <i className="fas fa-euro-sign text-3xl text-blue-500" />
          </div>
        </div>
      </div>

      {/* Barre d'actions et filtres */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-1 gap-4 w-full sm:w-auto">
            {/* Recherche */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Rechercher un contrat..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            {/* Filtre statut */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="draft">Brouillons</option>
              <option value="pending">En attente</option>
              <option value="signed">Signés</option>
              <option value="completed">Complétés</option>
            </select>
            
            {/* Filtre période */}
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes les dates</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
          </div>
          
          {/* Bouton nouveau contrat */}
          <button
            onClick={() => setIsCreating(true)}
            className="btn btn-primary"
          >
            <i className="fas fa-plus mr-2" />
            Nouveau contrat
          </button>
        </div>
      </div>

      {/* Liste des contrats */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client / Mariage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date événement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContracts.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {contract.contract_number}
                    </div>
                    <div className="text-sm text-gray-500">
                      Créé le {formatDate(contract.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {contract.customer?.user?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {contract.wedding?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(contract.wedding?.date, 'full')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(contract.total_amount)}
                    </div>
                    {getPaymentStatus(contract.payments)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(contract.status)}
                    {contract.signed_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        Signé le {formatDate(contract.signed_at)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir"
                      >
                        <i className="fas fa-eye" />
                      </button>
                      
                      {contract.status === 'draft' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setIsCreating(true);
                            }}
                            className="text-gray-600 hover:text-gray-900"
                            title="Modifier"
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button
                            onClick={() => sendContract(contract.id)}
                            className="text-green-600 hover:text-green-900"
                            title="Envoyer"
                          >
                            <i className="fas fa-paper-plane" />
                          </button>
                        </>
                      )}
                      
                      {contract.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowSignature(true);
                          }}
                          className="text-purple-600 hover:text-purple-900"
                          title="Signer"
                        >
                          <i className="fas fa-signature" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => duplicateContract(contract.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Dupliquer"
                      >
                        <i className="fas fa-copy" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredContracts.length === 0 && (
            <div className="text-center py-12">
              <i className="fas fa-file-contract text-6xl text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun contrat trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal création/édition de contrat */}
      {isCreating && (
        <ContractEditor
          contract={selectedContract}
          vendor={vendor}
          onSave={createContract}
          onClose={() => {
            setIsCreating(false);
            setSelectedContract(null);
          }}
        />
      )}

      {/* Modal visualisation de contrat */}
      {selectedContract && !isCreating && (
        <ContractViewer
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
          onEdit={() => setIsCreating(true)}
          onSign={() => setShowSignature(true)}
        />
      )}

      {/* Modal signature */}
      {showSignature && selectedContract && (
        <SignatureModal
          contract={selectedContract}
          onSign={async (signature) => {
            await updateContractStatus(selectedContract.id, 'signed');
            setShowSignature(false);
          }}
          onClose={() => setShowSignature(false)}
        />
      )}
    </div>
  );
}