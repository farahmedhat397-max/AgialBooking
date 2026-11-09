import { useState } from 'react';
import { getPrice } from '../data';

export default function Step2Nationality({ onNext }) {
  const [nationality, setNationality] = useState("");
  const price = getPrice(nationality);

  return (
    <div>
      <h3>اختر جنسيتك</h3>
      <select value={nationality} onChange={(e) => setNationality(e.target.value)}>
        <option value="">-- اختر --</option>
        <option value="inside">مصري داخل مصر</option>
        <option value="outside">مصري بالخارج / عربي</option>
        <option value="foreign">أجنبي</option>
      </select>

      {price && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f0f8ff' }}>
          <p>سعر الاستشارة الخاص بك:</p>
          <h2>{price.text}</h2>
          <button onClick={() => onNext({ nationality, price })}>متابعة للإقرار والدفع</button>
        </div>
      )}
    </div>
  );
}