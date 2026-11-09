import { useState } from 'react';
import { consentText } from '../data';

export default function Step3Consent({ bookingData, onSubmit }) {
  const [form, setForm] = useState({
    fullName: '', phone: '', email: '', nationalId: '', signatureName: '', agree: false, receipt: null
  });

  const handleSubmit = () => {
    if (!form.fullName || !form.phone || !form.signatureName || !form.agree || !form.receipt) {
      alert("من فضلك أكملي كل البيانات + كتابة التوقيع + الموافقة + رفع الإيصال");
      return;
    }
    onSubmit({ ...bookingData, ...form });
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <h3>إقرار موافقة على استشارة طبية عن بعد</h3>
      <div style={{ background: '#fafafa', padding: '15px', border: '1px solid #ddd', whiteSpace: 'pre-line', fontSize: '14px' }}>
        {consentText}
      </div>

      <h4 style={{marginTop:'15px'}}>بيانات المريض</h4>
      <input placeholder="الاسم رباعي" value={form.fullName} onChange={e=>setForm({...form, fullName: e.target.value})} style={{width:'100%', margin:'6px 0', padding:'10px'}} />
      <input placeholder="رقم الواتساب" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})} style={{width:'100%', margin:'6px 0', padding:'10px'}} />
      <input placeholder="البريد الإلكتروني" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} style={{width:'100%', margin:'6px 0', padding:'10px'}} />
      <input placeholder="الرقم القومي / جواز السفر" value={form.nationalId} onChange={e=>setForm({...form, nationalId: e.target.value})} style={{width:'100%', margin:'6px 0', padding:'10px'}} />

      <div style={{marginTop:'15px', padding:'12px', border:'1px solid #007bff', background:'#f0f8ff'}}>
        <p style={{margin:'0 0 5px 0'}}><b>التوقيع الإلكتروني:</b></p>
        <input placeholder="أكتب اسمك هنا كما سيظهر في التوقيع" value={form.signatureName} onChange={e=>setForm({...form, signatureName: e.target.value})} style={{width:'100%', padding:'10px', fontWeight:'bold'}} />
        <small>بكتابة اسمك هنا تعتبرين موقعاً على الإقرار</small>
      </div>

      <div style={{marginTop:'15px'}}>
        <label style={{fontWeight:'bold'}}><input type="checkbox" checked={form.agree} onChange={e=>setForm({...form, agree: e.target.checked})} /> أقر بأنني قرأت الإقرار كاملاً وأوافق عليه</label>
      </div>

      <div style={{marginTop:'15px', padding:'15px', background:'#fffbe6', border:'1px solid #ffe58f'}}>
        <p><b>بيانات التحويل CIB:</b><br/>100042902343<br/>IBAN: EG920010003400000100042902343</p>
        <p>رفع صورة إيصال التحويل (إجباري):</p>
        <input type="file" accept="image/*" onChange={e=>setForm({...form, receipt: e.target.files[0]})} />
      </div>

      <button onClick={handleSubmit} style={{marginTop:'20px', padding:'12px', width:'100%', background:'#007bff', color:'white', border:'none', fontSize:'16px'}}>إرسال الطلب</button>
    </div>
  );
}