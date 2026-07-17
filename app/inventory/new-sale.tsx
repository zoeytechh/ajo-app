import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  TextInput, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { FontSize, Radius, Shadow } from '../../src/theme';
import {
  getCategories, getProducts, getCustomers, recordSale,
  type InventoryProduct, type InventoryCustomer, type CreateSaleItemPayload,
} from '../../src/services/inventoryService';

const INV = '#E65100';

interface CartItem {
  product: InventoryProduct;
  quantity: number;
  unit_price: number;
}

export default function NewSaleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: categories } = useQuery({ queryKey: ['inventory-categories'], queryFn: getCategories });
  const { data: customers } = useQuery({ queryKey: ['inventory-customers'], queryFn: getCustomers });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<InventoryCustomer | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [productModal, setProductModal] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [qtyInput, setQtyInput] = useState<Record<number, string>>({});
  const [priceInput, setPriceInput] = useState<Record<number, string>>({});

  const { data: catProducts } = useQuery({
    queryKey: ['inventory-products', selectedCatId],
    queryFn: () => getProducts(selectedCatId!),
    enabled: !!selectedCatId,
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const items: CreateSaleItemPayload[] = cart.map(ci => ({
        product_id: ci.product.id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
      }));
      return recordSale({ customer_id: selectedCustomer?.id ?? null, notes: notes.trim(), items });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      qc.invalidateQueries({ queryKey: ['inventory-sales'] });
      Alert.alert('Sale Recorded', 'Stock has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.items ?? 'Could not record sale.'),
  });

  const addToCart = (product: InventoryProduct) => {
    const qty = parseInt(qtyInput[product.id] ?? '1', 10) || 1;
    const price = parseFloat(priceInput[product.id] ?? String(product.price)) || parseFloat(String(product.price));
    if (qty > product.quantity) {
      return Alert.alert('Insufficient Stock', `Only ${product.quantity} units available.`);
    }
    setCart(prev => {
      const existing = prev.findIndex(c => c.product.id === product.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + qty, unit_price: price };
        return updated;
      }
      return [...prev, { product, quantity: qty, unit_price: price }];
    });
    setProductModal(false);
  };

  const removeFromCart = (productId: number) =>
    setCart(prev => prev.filter(c => c.product.id !== productId));

  const total = cart.reduce((s, c) => s + c.quantity * c.unit_price, 0);

  const handleRecordSale = () => {
    if (cart.length === 0) return Alert.alert('Empty Cart', 'Add at least one item.');
    mutate();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>Record Sale</Text>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>Select products and confirm</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Customer */}
        <Text style={[s.sectionLabel, { color: colors.textPrimary }]}>Customer (optional)</Text>
        <TouchableOpacity
          onPress={() => setCustomerModal(true)}
          style={[s.rowBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
          <Text style={{ flex: 1, marginLeft: 10, fontSize: FontSize.sm, color: selectedCustomer ? colors.textPrimary : colors.textTertiary }}>
            {selectedCustomer ? selectedCustomer.name : 'Walk-in customer'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Cart */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 }}>
          <Text style={[s.sectionLabel, { color: colors.textPrimary, marginTop: 0 }]}>Items</Text>
          <TouchableOpacity
            onPress={() => setProductModal(true)}
            style={[s.smallAddBtn, { backgroundColor: INV }]}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: FontSize.xs, marginLeft: 4 }}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {cart.length === 0 ? (
          <View style={[s.emptyCart, { backgroundColor: colors.surface }]}>
            <Ionicons name="cart-outline" size={36} color={colors.textTertiary} />
            <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginTop: 8 }}>No items yet</Text>
          </View>
        ) : (
          cart.map((ci) => (
            <View key={ci.product.id} style={[s.cartItem, { backgroundColor: colors.surface, ...Shadow.card(colors.black) }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{ci.product.name}</Text>
                <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 3 }}>
                  {ci.quantity} × ₦{ci.unit_price.toLocaleString()} = ₦{(ci.quantity * ci.unit_price).toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => removeFromCart(ci.product.id)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <Ionicons name="close-circle" size={22} color={colors.error ?? '#D32F2F'} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Notes */}
        <Text style={[s.sectionLabel, { color: colors.textPrimary, marginTop: 20 }]}>Notes (optional)</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Any sale notes..."
          placeholderTextColor={colors.textTertiary}
          multiline
          style={[s.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
        />
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Total</Text>
          <Text style={{ fontSize: FontSize.lg, fontWeight: '800', color: colors.textPrimary }}>₦{total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          onPress={handleRecordSale}
          disabled={isPending || cart.length === 0}
          activeOpacity={0.85}
          style={[s.recordBtn, { backgroundColor: INV, opacity: isPending || cart.length === 0 ? 0.5 : 1 }]}
        >
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.md }}>Record Sale</Text>}
        </TouchableOpacity>
      </View>

      {/* Customer picker modal */}
      <Modal visible={customerModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 16 }}>Select Customer</Text>
            <TouchableOpacity onPress={() => { setSelectedCustomer(null); setCustomerModal(false); }}
              style={[s.custRow, { borderBottomColor: colors.border }]}>
              <Ionicons name="walk-outline" size={18} color={colors.textSecondary} />
              <Text style={{ marginLeft: 10, fontSize: FontSize.sm, color: colors.textSecondary }}>Walk-in customer</Text>
            </TouchableOpacity>
            <ScrollView style={{ maxHeight: 300 }}>
              {(customers ?? []).map((c) => (
                <TouchableOpacity key={c.id} onPress={() => { setSelectedCustomer(c); setCustomerModal(false); }}
                  style={[s.custRow, { borderBottomColor: colors.border }]}>
                  <View style={[s.miniAvatar, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={{ color: INV, fontWeight: '700' }}>{c.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{c.name}</Text>
                    {!!c.phone && <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>{c.phone}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setCustomerModal(false)} style={[s.cancelBtn, { backgroundColor: colors.background }]}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Product picker modal */}
      <Modal visible={productModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: colors.surface, maxHeight: '85%' }]}>
            <Text style={{ fontSize: FontSize.md, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 }}>Add Product</Text>
            {!selectedCatId ? (
              <>
                <Text style={{ fontSize: FontSize.sm, color: colors.textSecondary, marginBottom: 12 }}>Pick a category:</Text>
                <ScrollView style={{ maxHeight: 340 }}>
                  {(categories ?? []).map((cat) => (
                    <TouchableOpacity key={cat.id} onPress={() => setSelectedCatId(cat.id)}
                      style={[s.custRow, { borderBottomColor: colors.border }]}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '600', color: colors.textPrimary }}>{cat.name}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setSelectedCatId(null)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name="arrow-back" size={16} color={INV} />
                  <Text style={{ color: INV, fontSize: FontSize.sm, marginLeft: 4 }}>Back to categories</Text>
                </TouchableOpacity>
                <ScrollView style={{ maxHeight: 340 }}>
                  {(catProducts ?? []).map((p) => (
                    <View key={p.id} style={[s.custRow, { borderBottomColor: colors.border, flexDirection: 'column', alignItems: 'flex-start' }]}>
                      <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: colors.textPrimary }}>{p.name}</Text>
                      <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary, marginTop: 2 }}>
                        Stock: {p.quantity} · ₦{Number(p.price).toLocaleString()}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Qty</Text>
                          <TextInput
                            value={qtyInput[p.id] ?? '1'}
                            onChangeText={v => setQtyInput(prev => ({ ...prev, [p.id]: v }))}
                            keyboardType="numeric"
                            style={[s.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                          />
                        </View>
                        <View style={{ flex: 2 }}>
                          <Text style={{ fontSize: FontSize.xs, color: colors.textSecondary }}>Unit Price (₦)</Text>
                          <TextInput
                            value={priceInput[p.id] ?? String(p.price)}
                            onChangeText={v => setPriceInput(prev => ({ ...prev, [p.id]: v }))}
                            keyboardType="decimal-pad"
                            style={[s.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                          />
                        </View>
                        <TouchableOpacity onPress={() => addToCart(p)} style={[s.addItemBtn, { backgroundColor: INV }]}>
                          <Text style={{ color: '#fff', fontWeight: '800', fontSize: FontSize.xs }}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
            <TouchableOpacity onPress={() => { setProductModal(false); setSelectedCatId(null); }}
              style={[s.cancelBtn, { backgroundColor: colors.background, marginTop: 8 }]}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: FontSize.sm }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 18, borderBottomWidth: 1,
  },
  sectionLabel: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  rowBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  smallAddBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.md,
  },
  emptyCart: { borderRadius: Radius.lg, padding: 32, alignItems: 'center', justifyContent: 'center' },
  cartItem: { borderRadius: Radius.lg, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  notesInput: {
    borderWidth: 1.5, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: FontSize.sm, minHeight: 80, textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    padding: 20, borderTopWidth: 1,
  },
  recordBtn: {
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  custRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  miniInput: {
    borderWidth: 1.5, borderRadius: Radius.sm ?? 6,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: FontSize.sm,
  },
  addItemBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
