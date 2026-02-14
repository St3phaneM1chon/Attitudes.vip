/**
 * Tests d'intégration pour useVendors Hook
 * Tests avec contrats, paiements et temps réel
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useVendors } from '../../src/hooks/useVendors';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

// Mock StripeMultiVendorService
jest.mock('../../src/services/payment/stripe-multi-vendor', () => {
  return jest.fn().mockImplementation(() => ({
    createMultiVendorPayment: jest.fn().mockResolvedValue({
      paymentIntentId: 'pi_vendor_123',
      clientSecret: 'pi_vendor_123_secret',
      breakdown: {
        platformCommission: 150,
        vendors: [{
          vendorId: 'vendor_1',
          netAmount: 2850
        }]
      }
    })
  }));
});

// Données de test
const mockVendors = [
  {
    id: 'vendor_1',
    wedding_id: 'wedding_123',
    business_name: 'Fleurs & Déco',
    contact_name: 'Marie Florale',
    email: 'contact@fleursdeco.fr',
    phone: '+33612345678',
    category: 'florist',
    status: 'active',
    rating: 4.8,
    total_amount: 350000, // 3,500€
    paid_amount: 150000,  // 1,500€
    website: 'https://fleursdeco.fr',
    address: '15 rue des Fleurs, 75001 Paris',
    description: 'Spécialiste en décoration florale pour mariages',
    created_at: '2024-01-10T10:00:00Z'
  },
  {
    id: 'vendor_2',
    wedding_id: 'wedding_123',
    business_name: 'Photo Pro Wedding',
    contact_name: 'Jean Photographe',
    email: 'jean@photopro.fr',
    phone: '+33623456789',
    category: 'photographer',
    status: 'active',
    rating: 4.9,
    total_amount: 250000, // 2,500€
    paid_amount: 0,
    website: 'https://photopro.fr',
    created_at: '2024-01-12T10:00:00Z'
  },
  {
    id: 'vendor_3',
    wedding_id: 'wedding_123',
    business_name: 'DJ Master Mix',
    contact_name: 'Alex DJ',
    email: 'alex@djmaster.fr',
    phone: '+33634567890',
    category: 'dj',
    status: 'pending',
    rating: 4.5,
    total_amount: 150000, // 1,500€
    paid_amount: 0,
    created_at: '2024-01-15T10:00:00Z'
  }
];

const mockContracts = [
  {
    id: 'contract_1',
    vendor_id: 'vendor_1',
    wedding_id: 'wedding_123',
    contract_number: 'CTR-2024-001',
    status: 'signed',
    total_amount: 350000,
    terms: 'Décoration florale complète pour cérémonie et réception',
    signed_at: '2024-01-20T14:00:00Z',
    payment_schedule: [
      { amount: 150000, due_date: '2024-02-01', status: 'paid' },
      { amount: 100000, due_date: '2024-06-01', status: 'pending' },
      { amount: 100000, due_date: '2024-08-01', status: 'pending' }
    ],
    created_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 'contract_2',
    vendor_id: 'vendor_2',
    wedding_id: 'wedding_123',
    contract_number: 'CTR-2024-002',
    status: 'draft',
    total_amount: 250000,
    terms: 'Couverture photo complète + album',
    payment_schedule: [
      { amount: 100000, due_date: '2024-03-01', status: 'pending' },
      { amount: 150000, due_date: '2024-08-20', status: 'pending' }
    ],
    created_at: '2024-01-18T10:00:00Z'
  }
];

const mockPayments = [
  {
    id: 'payment_1',
    vendor_id: 'vendor_1',
    contract_id: 'contract_1',
    amount: 150000,
    status: 'completed',
    payment_method: 'card',
    stripe_payment_intent: 'pi_123',
    paid_at: '2024-02-01T10:00:00Z',
    description: 'Acompte 30%'
  }
];

const mockCategories = [
  { id: 'florist', name: 'Fleuriste', icon: 'flower' },
  { id: 'photographer', name: 'Photographe', icon: 'camera' },
  { id: 'dj', name: 'DJ / Animation', icon: 'music' },
  { id: 'caterer', name: 'Traiteur', icon: 'restaurant' },
  { id: 'venue', name: 'Lieu de réception', icon: 'location' }
];

describe('useVendors Hook Integration Tests', () => {
  let mockSupabase;
  let mockChannel;

  beforeEach(() => {
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    };

    mockSupabase = {
      from: jest.fn((table) => {
        if (table === 'wedding_vendors') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockVendors,
                  error: null
                }))
              }))
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { ...mockVendors[0], id: 'vendor_4', business_name: 'Nouveau Vendor' },
                  error: null
                }))
              }))
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn(() => ({
                    data: { ...mockVendors[0], status: 'confirmed' },
                    error: null
                  }))
                }))
              }))
            })),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: null,
                error: null
              }))
            }))
          };
        } else if (table === 'vendor_contracts') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockContracts,
                  error: null
                }))
              }))
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { ...mockContracts[0], id: 'contract_3' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'vendor_payments') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockPayments,
                  error: null
                }))
              }))
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { ...mockPayments[0], id: 'payment_2' },
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'vendor_categories') {
          return {
            select: jest.fn(() => ({
              data: mockCategories,
              error: null
            }))
          };
        }
      }),
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn()
    };

    createClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Chargement initial', () => {
    it('devrait charger tous les vendors et données associées', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Vérifier les vendors
      expect(result.current.vendors).toHaveLength(3);
      expect(result.current.vendors[0].business_name).toBe('Fleurs & Déco');

      // Vérifier les contrats
      expect(result.current.contracts).toHaveLength(2);
      expect(result.current.contracts[0].status).toBe('signed');

      // Vérifier les paiements
      expect(result.current.payments).toHaveLength(1);
      expect(result.current.payments[0].amount).toBe(150000);

      // Vérifier les catégories
      expect(result.current.categories).toHaveLength(5);
    });

    it('devrait calculer les totaux correctement', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Total général
      const totalAmount = result.current.vendors.reduce((sum, v) => sum + v.total_amount, 0);
      expect(totalAmount).toBe(750000); // 7,500€

      // Total payé
      const totalPaid = result.current.vendors.reduce((sum, v) => sum + v.paid_amount, 0);
      expect(totalPaid).toBe(150000); // 1,500€
    });
  });

  describe('Gestion des vendors', () => {
    it('devrait ajouter un nouveau vendor', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newVendor = {
        business_name: 'Gâteaux Délices',
        contact_name: 'Sophie Pâtissière',
        email: 'contact@gateaux-delices.fr',
        phone: '+33645678901',
        category: 'caterer',
        total_amount: 200000,
        description: 'Pâtisserie artisanale'
      };

      await act(async () => {
        const vendor = await result.current.actions.addVendor(newVendor);
        expect(vendor).toBeTruthy();
        expect(vendor.id).toBe('vendor_4');
      });
    });

    it('devrait mettre à jour un vendor', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const success = await result.current.actions.updateVendor('vendor_1', {
          status: 'confirmed',
          notes: 'Rendez-vous confirmé pour essai'
        });
        expect(success).toBe(true);
      });
    });

    it('devrait supprimer un vendor', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const success = await result.current.actions.deleteVendor('vendor_3');
        expect(success).toBe(true);
      });
    });
  });

  describe('Gestion des contrats', () => {
    it('devrait créer un nouveau contrat', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const contractData = {
        vendor_id: 'vendor_3',
        total_amount: 150000,
        terms: 'Animation musicale pour soirée',
        payment_schedule: [
          { amount: 50000, due_date: '2024-04-01' },
          { amount: 100000, due_date: '2024-08-20' }
        ]
      };

      await act(async () => {
        const contract = await result.current.actions.createContract(contractData);
        expect(contract).toBeTruthy();
        expect(contract.id).toBe('contract_3');
      });
    });

    it('devrait signer un contrat', async () => {
      mockSupabase.from('vendor_contracts').update = jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { ...mockContracts[1], status: 'signed', signed_at: new Date() },
              error: null
            }))
          }))
        }))
      }));

      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const success = await result.current.actions.signContract('contract_2');
        expect(success).toBe(true);
      });
    });
  });

  describe('Gestion des paiements', () => {
    it('devrait enregistrer un paiement direct', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const paymentData = {
        vendor_id: 'vendor_2',
        contract_id: 'contract_2',
        amount: 100000,
        payment_method: 'transfer',
        description: 'Acompte 40%'
      };

      await act(async () => {
        const payment = await result.current.actions.recordPayment(paymentData);
        expect(payment).toBeTruthy();
        expect(payment.id).toBe('payment_2');
      });
    });

    it('devrait initier un paiement Stripe', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const stripePayment = await result.current.actions.initiateStripePayment(
          'vendor_1',
          100000,
          'Deuxième versement'
        );
        
        expect(stripePayment).toBeTruthy();
        expect(stripePayment.paymentIntentId).toBe('pi_vendor_123');
        expect(stripePayment.breakdown.vendors[0].netAmount).toBe(2850);
      });
    });
  });

  describe('Communications', () => {
    it('devrait envoyer une communication à un vendor', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const messageData = {
        vendor_id: 'vendor_1',
        type: 'email',
        subject: 'Confirmation rendez-vous',
        message: 'Confirmons notre rendez-vous du 15 mars'
      };

      await act(async () => {
        const success = await result.current.actions.sendCommunication(messageData);
        expect(success).toBe(true);
      });
    });
  });

  describe('Filtrage et recherche', () => {
    it('devrait filtrer par catégorie', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const florists = result.current.vendors.filter(v => v.category === 'florist');
      expect(florists).toHaveLength(1);
      expect(florists[0].business_name).toBe('Fleurs & Déco');
    });

    it('devrait filtrer par statut', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const activeVendors = result.current.vendors.filter(v => v.status === 'active');
      expect(activeVendors).toHaveLength(2);
    });

    it('devrait rechercher par nom', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const searchResults = result.current.vendors.filter(v => 
        v.business_name.toLowerCase().includes('photo')
      );
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].business_name).toBe('Photo Pro Wedding');
    });
  });

  describe('WebSocket temps réel', () => {
    it('devrait gérer les nouveaux vendors en temps réel', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const vendorHandler = mockChannel.on.mock.calls.find(
        call => call[1].table === 'wedding_vendors'
      )[2];

      const newVendor = {
        id: 'vendor_5',
        wedding_id: 'wedding_123',
        business_name: 'Vendor Temps Réel',
        category: 'venue',
        status: 'pending',
        total_amount: 500000
      };

      act(() => {
        vendorHandler({
          eventType: 'INSERT',
          new: newVendor
        });
      });

      expect(result.current.vendors).toHaveLength(4);
      expect(result.current.vendors.find(v => v.id === 'vendor_5')).toBeTruthy();
    });

    it('devrait gérer les nouveaux paiements en temps réel', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const paymentHandler = mockChannel.on.mock.calls.find(
        call => call[1].table === 'vendor_payments'
      )[2];

      const newPayment = {
        id: 'payment_3',
        vendor_id: 'vendor_1',
        amount: 100000,
        status: 'completed',
        paid_at: new Date().toISOString()
      };

      act(() => {
        paymentHandler({
          eventType: 'INSERT',
          new: newPayment
        });
      });

      expect(result.current.payments).toHaveLength(2);

      // Le montant payé du vendor devrait être mis à jour
      const updatedVendor = result.current.vendors.find(v => v.id === 'vendor_1');
      expect(updatedVendor.paid_amount).toBe(250000); // 150k + 100k
    });

    it('devrait gérer les mises à jour de contrats', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const contractHandler = mockChannel.on.mock.calls.find(
        call => call[1].table === 'vendor_contracts'
      )[2];

      act(() => {
        contractHandler({
          eventType: 'UPDATE',
          new: {
            ...mockContracts[1],
            status: 'signed',
            signed_at: new Date().toISOString()
          }
        });
      });

      const updatedContract = result.current.contracts.find(c => c.id === 'contract_2');
      expect(updatedContract.status).toBe('signed');
    });
  });

  describe('Calculs et statistiques', () => {
    it('devrait calculer le solde restant par vendor', async () => {
      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const vendor1 = result.current.vendors.find(v => v.id === 'vendor_1');
      const remaining = vendor1.total_amount - vendor1.paid_amount;
      expect(remaining).toBe(200000); // 3500 - 1500 = 2000€
    });

    it('devrait identifier les paiements en retard', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-15'));

      const { result } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Vérifier les échéances de paiement
      const overduePayments = [];
      result.current.contracts.forEach(contract => {
        if (contract.payment_schedule) {
          contract.payment_schedule.forEach(schedule => {
            if (schedule.status === 'pending' && new Date(schedule.due_date) < new Date()) {
              overduePayments.push({
                contract_id: contract.id,
                amount: schedule.amount,
                due_date: schedule.due_date
              });
            }
          });
        }
      });

      expect(overduePayments).toHaveLength(1); // Le paiement du 1er juin est en retard
      expect(overduePayments[0].amount).toBe(100000);

      jest.useRealTimers();
    });
  });

  describe('Nettoyage', () => {
    it('devrait nettoyer les subscriptions au démontage', async () => {
      const { result, unmount } = renderHook(() => useVendors('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});