import { supabase } from '@lib/supabase';

export type ItemType = 'shield' | 'magnet' | 'revival';

export interface InventoryItem {
  item_type: ItemType;
  quantity: number;
}

export class InventoryService {
  /**
   * 아이템 수량 증감.
   * amount > 0 = 획득 (룰렛 보상 등)
   * amount < 0 = 소비 (게임 시작 전 사용)
   * 잔량 부족 시 Supabase check 제약 위반으로 에러 발생.
   */
  async addItem(itemType: ItemType, amount: number): Promise<number> {
    const { data, error } = await supabase.rpc('add_item', {
      p_item_type: itemType,
      p_amount: amount,
    });
    if (error) throw error;
    return data as number;
  }

  /** 보유 아이템 전체 조회. 비로그인 시 빈 배열 반환. */
  async getInventory(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('player_inventory')
      .select('item_type, quantity');
    if (error) return [];
    return (data ?? []) as InventoryItem[];
  }

  /** 특정 아이템 보유 수량. 없으면 0 반환. */
  async getQuantity(itemType: ItemType): Promise<number> {
    const { data, error } = await supabase
      .from('player_inventory')
      .select('quantity')
      .eq('item_type', itemType)
      .maybeSingle();
    if (error || !data) return 0;
    return data.quantity;
  }
}

export const inventoryService = new InventoryService();
