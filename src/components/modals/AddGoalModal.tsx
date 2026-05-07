import React from 'react';
import { AnimatePresence } from 'motion/react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { dbService } from '../../services/db';

interface AddGoalModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function AddGoalModal({ onClose, onSuccess, onError }: AddGoalModalProps) {
  return (
    <AnimatePresence>
      <Modal
        title="Yeni Hedef Koy"
        onClose={onClose}
        onSave={async data => {
          try {
            if (!data.name?.trim()) {
              onError('Hedef adı giriniz!');
              return;
            }
            const target = Number(data.target);
            if (target <= 0) {
              onError('Hedef değeri 0\'dan büyük olmalıdır!');
              return;
            }
            await dbService.add('goals', {
              name:   data.name.trim(),
              target,
              type:   data.type,
              date:   data.date || null,
            });
            onClose();
            onSuccess('Hedef eklendi!');
          } catch (err: any) {
            onError(err.message || 'Hedef eklenemedi!');
          }
        }}
        saveLabel="Hedefi Kaydet"
      >
        <div className="space-y-4">
          <Input label="Hedef Adı" name="name" required placeholder="Örn: Yıllık 100.000₺ Temettü" autoFocus />

          <Select
            label="Hedef Türü"
            name="type"
            options={[
              { label: '📅 Yıllık Temettü Geliri', value: 'annual_div' },
              { label: '🗓️ Aylık Temettü Geliri',   value: 'monthly_div' },
              { label: '💼 Portföy Toplam Değeri',   value: 'portfolio_val' },
              { label: '💰 Tüm Zamanlar Temettü',   value: 'total_div' },
              { label: '📊 Hisse Sayısı',             value: 'stock_count' },
            ]}
            defaultValue="annual_div"
          />

          <Input label="Hedef Rakam" name="target" type="number" min="1" required />
          <Input label="Hedef Tarihi (opsiyonel)" name="date" type="date" />
        </div>
      </Modal>
    </AnimatePresence>
  );
}
