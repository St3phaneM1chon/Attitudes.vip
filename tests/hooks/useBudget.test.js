/**
 * Tests d'intégration pour useBudget Hook
 * Tests avec intégration Stripe et temps réel
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useBudget } from '../../src/hooks/useBudget';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

// Mock StripeMultiVendorService
jest.mock('../../src/services/payment/stripe-multi-vendor', () => {
  return jest.fn().mockImplementation(() => ({
    createMultiVendorPayment: jest.fn().mockResolvedValue({
      paymentIntentId: 'pi_test_123',
      clientSecret: 'pi_test_123_secret',
      breakdown: {
        platformCommission: 500,
        vendors: []
      }
    })
  }));
});

// Données de test
const mockBudgetData = {
  id: 'budget_123',
  wedding_id: 'wedding_123',
  total_budget: 2000000, // 20,000€
  spent_amount: 750000,  // 7,500€
  committed_amount: 500000, // 5,000€
  currency: 'EUR',
  created_at: '2024-01-01T10:00:00Z'
};

const mockCategories = [
  {
    id: 'cat_1',
    budget_id: 'budget_123',
    name: 'Venue',
    allocated_amount: 800000, // 8,000€
    spent_amount: 300000,    // 3,000€
    priority: 'high',
    icon: 'location',
    color: '#3498db'
  },
  {
    id: 'cat_2',
    budget_id: 'budget_123',
    name: 'Catering',
    allocated_amount: 600000, // 6,000€
    spent_amount: 250000,    // 2,500€
    priority: 'high',
    icon: 'restaurant',
    color: '#e74c3c'
  }
];

const mockTransactions = [
  {
    id: 'trans_1',
    category_id: 'cat_1',
    amount: 300000,
    type: 'payment',
    status: 'completed',
    description: 'Acompte lieu de réception',
    vendor_name: 'Château de Versailles',
    date: '2024-01-15T10:00:00Z',
    payment_method: 'card'
  },
  {
    id: 'trans_2',
    category_id: 'cat_2',
    amount: 250000,
    type: 'payment',
    status: 'completed',
    description: 'Acompte traiteur',
    vendor_name: 'Le Grand Chef',
    date: '2024-01-20T15:00:00Z',
    payment_method: 'transfer'
  }
];

describe('useBudget Hook Integration Tests', () => {
  let mockSupabase;
  let mockChannel;

  beforeEach(() => {
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn()
    };

    mockSupabase = {
      from: jest.fn((table) => {
        if (table === 'wedding_budgets') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockBudgetData,
                  error: null
                }))
              }))
            })),
            upsert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: mockBudgetData,
                  error: null
                }))
              }))
            }))
          };
        } else if (table === 'budget_categories') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockCategories,
                  error: null
                }))
              }))
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { ...mockCategories[0], id: 'cat_3', name: 'Flowers' },
                  error: null
                }))
              }))
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  single: jest.fn(() => ({
                    data: { ...mockCategories[0], allocated_amount: 900000 },
                    error: null
                  }))
                }))
              }))
            }))
          };
        } else if (table === 'budget_transactions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  data: mockTransactions,
                  error: null
                }))
              }))
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => ({
                  data: { ...mockTransactions[0], id: 'trans_3' },
                  error: null
                }))
              }))
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

  describe('Chargement et calculs', () => {
    it('devrait charger le budget et calculer les métriques', async () => {
      const { result } = renderHook(() => useBudget('wedding_123'));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Vérifier l'overview
      expect(result.current.overview.totalBudget).toBe(2000000);
      expect(result.current.overview.spent).toBe(750000);
      expect(result.current.overview.committed).toBe(500000);
      expect(result.current.overview.remaining).toBe(750000); // 20000 - 7500 - 5000
      expect(result.current.overview.percentUsed).toBe(62.5); // (7500 + 5000) / 20000

      // Vérifier les catégories
      expect(result.current.categories).toHaveLength(2);
      expect(result.current.categories[0].percentUsed).toBe(37.5); // 3000 / 8000
    });

    it('devrait gérer l\'absence de budget initial', async () => {
      mockSupabase.from('wedding_budgets').select.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      });

      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.overview.totalBudget).toBe(0);
      expect(result.current.categories).toEqual([]);
    });
  });

  describe('Gestion des catégories', () => {
    it('devrait ajouter une catégorie', async () => {
      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const newCategory = {
        name: 'Photography',
        allocated_amount: 300000,
        priority: 'medium',
        icon: 'camera',
        color: '#9b59b6'
      };

      await act(async () => {
        const added = await result.current.actions.addBudgetItem(newCategory);
        expect(added).toBeTruthy();
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('budget_categories');
    });

    it('devrait mettre à jour une catégorie', async () => {
      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        const success = await result.current.actions.updateBudgetItem('cat_1', {
          allocated_amount: 900000
        });
        expect(success).toBe(true);
      });

      expect(mockSupabase.from('budget_categories').update).toHaveBeenCalled();
    });
  });

  describe('Transactions et paiements', () => {
    it('devrait enregistrer un paiement direct', async () => {
      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const paymentData = {
        category_id: 'cat_1',
        amount: 100000,
        description: 'Deuxième acompte',
        vendor_name: 'Château de Versailles',
        payment_method: 'transfer'
      };

      await act(async () => {
        const transaction = await result.current.actions.recordPayment(paymentData);
        expect(transaction).toBeTruthy();
        expect(transaction.id).toBe('trans_3');
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('budget_transactions');
    });

    it('devrait initier un paiement Stripe', async () => {
      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const paymentRequest = {
        category_id: 'cat_2',
        amount: 150000,
        vendors: [{
          vendorId: 'vendor_1',
          name: 'Le Grand Chef',
          amount: 150000
        }]
      };

      await act(async () => {
        const stripePayment = await result.current.actions.initiateStripePayment(paymentRequest);
        expect(stripePayment).toBeTruthy();
        expect(stripePayment.paymentIntentId).toBe('pi_test_123');
      });
    });
  });

  describe('Alertes budgétaires', () => {
    it('devrait générer des alertes appropriées', async () => {
      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.alerts).toHaveLength(2);
      
      // Alerte de dépassement global
      const overBudgetAlert = result.current.alerts.find(a => a.type === 'danger');
      expect(overBudgetAlert).toBeTruthy();
      expect(overBudgetAlert.message).toContain('dépasse');

      // Alerte d'avertissement catégorie
      const categoryAlert = result.current.alerts.find(a => a.type === 'warning' && a.category === 'Catering');
      expect(categoryAlert).toBeTruthy();
    });

    it('ne devrait pas générer d\'alertes si budget respecté', async () => {
      // Mock avec budget non dépassé
      mockSupabase.from('wedding_budgets').select.mockReturnValue({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              ...mockBudgetData,
              total_budget: 5000000, // 50,000€
              spent_amount: 500000,   // 5,000€
              committed_amount: 0
            },
            error: null
          }))
        }))
      });

      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const dangerAlerts = result.current.alerts.filter(a => a.type === 'danger');
      expect(dangerAlerts).toHaveLength(0);
    });
  });

  describe('Export et rapports', () => {
    it('devrait générer un rapport budgétaire', async () => {
      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const report = result.current.actions.exportBudgetReport();
      
      expect(report).toContain('Rapport Budgétaire');
      expect(report).toContain('Budget Total: 20,000.00 EUR');
      expect(report).toContain('Dépensé: 7,500.00 EUR');
      expect(report).toContain('Venue');
      expect(report).toContain('Catering');
      expect(report).toContain('Château de Versailles');
    });
  });

  describe('WebSocket temps réel', () => {
    it('devrait gérer les mises à jour de catégories en temps réel', async () => {
      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Récupérer le handler pour les catégories
      const categoryHandler = mockChannel.on.mock.calls.find(
        call => call[1].table === 'budget_categories'
      )[2];

      act(() => {
        categoryHandler({
          eventType: 'UPDATE',
          new: {
            ...mockCategories[0],
            spent_amount: 400000 // Augmentation de 100k
          }
        });
      });

      // Vérifier la mise à jour
      const updatedCategory = result.current.categories.find(c => c.id === 'cat_1');
      expect(updatedCategory.spent_amount).toBe(400000);
      
      // Le total dépensé devrait aussi augmenter
      expect(result.current.overview.spent).toBe(850000); // 750k + 100k
    });

    it('devrait gérer les nouvelles transactions en temps réel', async () => {
      const { result } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      const transactionHandler = mockChannel.on.mock.calls.find(
        call => call[1].table === 'budget_transactions'
      )[2];

      const newTransaction = {
        id: 'trans_4',
        category_id: 'cat_1',
        amount: 50000,
        type: 'payment',
        status: 'completed',
        description: 'Décoration florale',
        date: new Date().toISOString()
      };

      act(() => {
        transactionHandler({
          eventType: 'INSERT',
          new: newTransaction
        });
      });

      expect(result.current.transactions).toHaveLength(3);
      expect(result.current.transactions.find(t => t.id === 'trans_4')).toBeTruthy();
    });
  });

  describe('Nettoyage', () => {
    it('devrait nettoyer les subscriptions au démontage', async () => {
      const { result, unmount } = renderHook(() => useBudget('wedding_123'));

      await waitFor(() => expect(result.current.loading).toBe(false));

      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});