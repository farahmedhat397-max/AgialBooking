import { useState, useEffect } from 'react';
import './App.css';

const SHEET_URL = "https://script.google.com/macros/s/AKfycbwB3zkdGDVHEp9B6M-npcNbO5ayQsSW6BbbtXRuBnhvbmVdt3jfTZWPHohv562EbYavbg/exec";
const ADMIN_WA = "201119947744";
const HELP_MESSENGER = "agialhospital";

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { resolve(new File([blob], file.name, {type: 'image/jpeg'})); }, 'image/jpeg', 0.6);
      };
    };
  });
};

export default function App() {
  const [doctorsList, setDoctorsList] = useState(() => {
    try { const cached = localStorage.getItem('agial_doctors_cache'); return cached ? JSON.parse(cached) : []; } catch(e){ return []; }
  });
  const [step, setStep] = useState(1);
  const [data, setData] = useState({ specialty: '', doctorObj: null, nationality: '', fullName: '', phone: '', email: '', nationalId: '', signature: '', agree: false, receipt: null, previewUrl: null });
  const [sending, setSending] = useState(false);
  const isForeign = data.nationality === 'foreign';

  const track = (stepName) => {
    try {
      if(!SHEET_URL || SHEET_URL.includes("PASTE_YOUR")) return;
      fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({ type: 'analytics', step: stepName, specialty: data.specialty, doctor: data.doctorObj?.name || '', nationality: data.nationality || '' }) });
    } catch(e){}
  };

  useEffect(() => {
    if (!SHEET_URL || SHEET_URL.includes("PASTE_YOUR")) return;
    fetch(SHEET_URL).then(r => r.json()).then(list => {
      if (Array.isArray(list) && list.length > 0) {
        setDoctorsList(list);
        localStorage.setItem('agial_doctors_cache', JSON.stringify(list));
        setData(d => ({...d, specialty: d.specialty || list[0].key}));
      }
    }).catch(()=>{});
    track("1- Entered site");
  }, []);

  useEffect(() => { if(step===2) track("2- Chose Doctor"); if(step===3) track("3- Reached Payment"); }, [step]);

  const specialtiesMap = {};
  doctorsList.forEach(d => {
    if(!specialtiesMap[d.key]) specialtiesMap[d.key] = { name: d.specialty, doctors: [] };
    specialtiesMap[d.key].doctors.push(d);
  });
  specialtiesMap['help'] = { name: "❓ أحتاج مساعدة / Need Help", isHelp: true, doctors: [] };

  const currentPrice = (data.doctorObj && data.nationality) ? (isForeign ? data.doctorObj.price.foreign : (data.nationality==='outside' ? data.doctorObj.price.outside : data.doctorObj.price.inside)) : null;

  const getValidationError = () => {
    if(isForeign){
      if(!data.fullName.trim() || data.fullName.trim().split(' ').length < 2) return "Full Name is required (at least 2 words)";
      if(!data.phone || data.phone.replace(/\D/g,'').length < 8) return "Valid WhatsApp Number is required";
      if(!data.email.trim() || !data.email.includes('@')) return "Valid Email is required";
      if(!data.nationalId.trim()) return "National ID / Passport is required";
      if(!data.signature.trim()) return "Electronic Signature is required";
      if(!data.agree) return "You must agree to the consent";
      if(!data.receipt) return "Receipt upload is required";
    } else {
      if(!data.fullName.trim() || data.fullName.trim().split(' ').length < 2) return "الاسم رباعي مطلوب";
      if(!data.phone || data.phone.replace(/\D/g,'').length < 10) return "رقم واتساب صحيح مطلوب";
      if(!data.email.trim() || !data.email.includes('@')) return "البريد الإلكتروني مطلوب";
      if(!data.nationalId.trim()) return "الرقم القومي / جواز السفر مطلوب";
      if(!data.signature.trim()) return "التوقيع الإلكتروني مطلوب";
      if(!data.agree) return "لازم توافق على الإقرار";
      if(!data.receipt) return "رفع صورة الإيصال مطلوب";
    }
    return null;
  };
  const validationError = getValidationError();

  const handleFinalSubmit = async () => {
    const err = getValidationError();
    if(err){ alert(err); return; }
    setSending(true);
    const toBase64 = f => new Promise(r => { const rd = new FileReader(); rd.readAsDataURL(f); rd.onload = () => r(rd.result.split(',')[1]); });
    const b64 = await toBase64(data.receipt);
    let receiptLink = "";
    try {
      const res = await fetch(SHEET_URL, { method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify({ specialty: specialtiesMap[data.specialty]?.name || '', doctor: data.doctorObj.name, nationality: data.nationality, price: currentPrice, note: data.doctorObj.note, fullName: data.fullName, phone: data.phone, email: data.email, nationalId: data.nationalId, signature: data.signature, agree: "موافق - Agreed", receiptName: data.receipt.name, receiptType: 'image/jpeg', receiptBase64: b64 }) });
      const j = await res.json();
      receiptLink = j.receiptUrl || "";
    } catch(e) { receiptLink = "Check Sheet"; }

    const msg = isForeign ? 
`🔔 New Booking - Agial
Specialty: ${specialtiesMap[data.specialty].name}
Doctor: ${data.doctorObj.name}
Price: ${currentPrice}
Name: ${data.fullName}
Phone / WhatsApp: ${data.phone}
Email: ${data.email}
National ID / Passport: ${data.nationalId}
Signature: ${data.signature}
📎 Receipt: ${receiptLink}` 
:
`🔔 حجز جديد - أجيال
التخصص: ${specialtiesMap[data.specialty].name}
الدكتور: ${data.doctorObj.name}
السعر: ${currentPrice}
الاسم: ${data.fullName}
الهاتف: ${data.phone}
البريد الإلكتروني: ${data.email}
الرقم القومي: ${data.nationalId}
📎 الإيصال: ${receiptLink}`;

    window.open(`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(msg)}`, '_blank');
    setStep(4);
    setSending(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if(file){
      const compressed = await compressImage(file);
      if(data.previewUrl) URL.revokeObjectURL(data.previewUrl);
      setData({...data, receipt: compressed, previewUrl: URL.createObjectURL(compressed)});
    }
  };

  return (
    <div className="container" style={{direction: 'rtl'}}>
      <div className="header" style={{display:'flex', alignItems:'center', gap:'12px', padding:'10px'}}>
        <img src="/logo.png" className="logo" alt="logo" style={{width:'65px', height:'65px', objectFit:'contain'}}/>
        <div style={{lineHeight:'1.2'}}><b style={{fontSize:'18px'}}>مستشفي أجيال / Agial Hospital</b></div>
      </div>

      {step===1 && <div className="card">
        <span className="step-badge">الخطوة 1 من 3 / Step 1 of 3</span>
        <h3>اختار التخصص / Choose Specialty</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
          {Object.keys(specialtiesMap).map(k=><button key={k} onClick={()=>{ if(specialtiesMap[k].isHelp){ window.open(`https://m.me/${HELP_MESSENGER}`, '_blank'); return;} setData({...data, specialty:k, doctorObj:null}); }} className="select-box" style={{background: data.specialty===k ? '#1A3A6D':'#FAFBFD', color: data.specialty===k?'white':'black', fontSize:'13px', padding:'10px'}}>{specialtiesMap[k].name}</button>)}
        </div>
        <h4 style={{marginTop:'15px'}}>اختار الدكتور / Choose Doctor</h4>
        <select className="select-box" value={data.doctorObj?.name || ''} onChange={e=>{ const obj = specialtiesMap[data.specialty]?.doctors.find(d=>d.name===e.target.value); setData({...data, doctorObj: obj}); }}>
          <option value="">-- اختر / Choose --</option>
          {specialtiesMap[data.specialty]?.doctors?.map(d=><option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
        <button className="btn-primary" disabled={!data.doctorObj} onClick={()=>setStep(2)}>التالي / Next</button>
      </div>}

      {step===2 && <div className="card">
        <span className="step-badge">الخطوة 2 من 3 / Step 2 of 3</span>
        <h3>الجنسية / Nationality</h3>
        <select className="select-box" value={data.nationality} onChange={e=>setData({...data, nationality: e.target.value})}>
          <option value="">-- اختر / Choose --</option>
          <option value="inside">عربي (داخل مصر)</option>
          <option value="outside">عربي (خارج مصر)</option>
          <option value="foreign">اجنبي / Foreigner</option>
        </select>
        {currentPrice && data.nationality && 
          <div className="price-box" style={{background:'#1A2332', color:'#FFFFFF', border:'1px solid #2A3441', padding:'16px', borderRadius:'12px'}}>
            <div style={{color:'#FFFFFF', fontSize:'14px', opacity:0.9}}>{data.doctorObj.name}</div>
            <h2 style={{color:'#FFFFFF', margin:'8px 0'}}>السعر / Price: {currentPrice}</h2>
            {data.doctorObj.note && <div style={{background:'#2A3441', color:'#FFFFFF', padding:'12px', borderRadius:'8px', marginTop:'12px', fontSize:'13px', border:'1px solid #3A4451', lineHeight:'1.6'}}>📌 {isForeign ? (data.doctorObj.noteEn || data.doctorObj.note) : data.doctorObj.note}</div>}
          </div>
        }
        <button className="btn-primary" disabled={!data.nationality} onClick={()=>setStep(3)}>متابعة للإقرار والدفع / Continue to Consent & Payment</button>
      </div>}

      {step===3 && <div className="card" style={{direction: isForeign ? 'ltr' : 'rtl'}}>
        <span className="step-badge">الخطوة 3 من 3 / Step 3 of 3</span>

        {!isForeign ? (
          <div className="consent-box" style={{fontSize:'13px', maxHeight:'340px', overflowY:'auto', border:'1px solid #ddd', padding:'14px', lineHeight:'1.9', background:'#fff'}}>
            <h3 style={{textAlign:'center', marginTop:0}}>اقرار موافقة على استشارة طبية عن بعد</h3>
            <p>أقر أنا الموقع أدناه بالموافقة على تلقي استشارة طبية من خلال طبيب بشري متخصص في مجاله وذلك باستخدام إحدى وسائل الاتصال الإلكترونية مثل (الهاتف أو الفيديو أو التطبيقات).</p>
            <p><b>وأقر بمعرفتي الكاملة بالتالي:</b></p>
            <p>1- الاستشارة الطبية عن بعد لا تغني عن الكشف الطبي المباشر في الحالات التي تستدعي ذلك وفقا لما يقرره الطبيب.</p>
            <p>2- لا يتم وصف الأدوية خلال الاستشارة الطبية عن بعد وفي حالة رغبة المريض في استلام وصفة طبية أو تقرير طبي يتم استلامه من المستشفى.</p>
            <hr/>
            <p style={{direction:'ltr', textAlign:'left'}}><b>Consent to Telemedicine Consultation</b></p>
            <p style={{direction:'ltr', textAlign:'left'}}>I, the undersigned, hereby consent to receive a medical consultation from qualified physicians specialized in their field using one of the electronic communication methods such as (phone, video or applications).</p>
            <p style={{direction:'ltr', textAlign:'left'}}>1- Telemedicine does not replace in-person examination. 2- No prescriptions during telemedicine. 3- Payment in advance and non-refundable. 4- Duration 20 minutes. 5- I agree to record consultation.</p>
          </div>
        ) : (
          <div className="consent-box" style={{fontSize:'13px', maxHeight:'340px', overflowY:'auto', border:'1px solid #ddd', padding:'14px', lineHeight:'1.9', background:'#fff', direction:'ltr', textAlign:'left'}}>
            <h3 style={{textAlign:'center', marginTop:0}}>Consent to Telemedicine Consultation</h3>
            <p>I, the undersigned, hereby consent to receive a medical consultation from qualified physicians specialized in their field using one of the electronic communication methods such as (video or call via applications).</p>
            <p><b>I acknowledge that i am fully aware of the following:</b></p>
            <p>1- Remote medical consultation does not replace in-person medical examination in cases that require it as determined by the physician.</p>
            <p>2- Medications will not be prescribed during remote consultation, and if the patient wishes to obtain a prescription or medical report, it must be collected from the hospital.</p>
          </div>
        )}

        <div style={{background:'#F9FAFB', padding:'12px', borderRadius:'8px', marginTop:'15px'}}>
          <h4>{isForeign ? "Booking Data" : "بيانات الحجز"}</h4>
          <input className="input" placeholder={isForeign ? "Full Name * required" : "الاسم رباعي * مطلوب"} value={data.fullName} onChange={e=>setData({...data, fullName: e.target.value})} />
          <input className="input" placeholder={isForeign ? "WhatsApp Number * required" : "رقم الواتساب *"} value={data.phone} onChange={e=>setData({...data, phone: e.target.value})} />
          <input className="input" placeholder={isForeign ? "Email * required" : "البريد الإلكتروني * مطلوب"} value={data.email} onChange={e=>setData({...data, email: e.target.value})} />
          <input className="input" placeholder={isForeign ? "National ID / Passport * required" : "الرقم القومي / جواز السفر * مطلوب"} value={data.nationalId} onChange={e=>setData({...data, nationalId: e.target.value})} />
          <div style={{background:'#F0F8FF', padding:'12px', borderRadius:'10px', border:'1px solid #1A3A6D', marginTop:'10px'}}><b>{isForeign ? "Electronic Signature *" : "التوقيع الإلكتروني *"}</b><input className="input" placeholder={isForeign ? "Type name as signature *" : "اكتب اسمك كتوقيع *"} value={data.signature} onChange={e=>setData({...data, signature: e.target.value})} /></div>
          <label style={{display:'block', margin:'15px 0', background:'#E8F5E9', padding:'10px', borderRadius:'6px'}}><input type="checkbox" checked={data.agree} onChange={e=>setData({...data, agree: e.target.checked})} /> {isForeign ? " I agree to the consent *" : " أوافق على الإقرار *"}</label>
        </div>

        <div style={{background:'#FFFBEB', padding:'18px', borderRadius:'12px', border:'1px solid #FCD34D', marginTop:'15px', lineHeight:'1.7', fontSize:'14px'}}>
          <h3 style={{margin:'0 0 12px 0', color:'#1A3A6D'}}>{isForeign ? "Payment Methods" : "طرق الدفع"}</h3>
          <p style={{margin:'0 0 12px 0'}}>{isForeign ? "You can complete your booking payment through one of the following methods:" : "يمكنك إتمام عملية الدفع الخاصة بحجزك من خلال إحدى الطرق التالية:"}</p>
          
          <div style={{background:'white', padding:'12px', borderRadius:'8px', marginBottom:'12px', border:'1px solid #FFE69C'}}>
            <b>{isForeign ? "1st: Bank Transfer" : "أولاً: التحويل البنكي (Bank Transfer)"}</b><br/>
            - {isForeign ? "Bank Name" : "اسم البنك"}: {isForeign ? "Commercial International Bank (CIB)" : "البنك التجاري الدولي (CIB)"}<br/>
            - {isForeign ? "Account No." : "رقم الحساب"}: 100042902343<br/>
            - {isForeign ? "Account Name" : "اسم الحساب"}: AGYAL FERTILITY<br/>
            - IBAN: EG920010003400000100042902343<br/>
            - SWIFT CODE: CIBEEGCX009
          </div>
          
          <div style={{background:'white', padding:'12px', borderRadius:'8px', marginBottom:'12px', border:'1px solid #FFE69C'}}>
            <b>{isForeign ? "2nd: Via InstaPay" : "ثانياً: التحويل عن طريق InstaPay"}</b><br/>
            - Bank Name: Commercial International Bank (CIB)<br/>
            - Account No.: 100008416197<br/>
            - Receiver Name: AGYAL FERTILITY CO
          </div>
          
          <div style={{background:'#FFF3CD', padding:'10px', borderRadius:'8px', marginBottom:'15px', color:'#000'}}>
            <b>{isForeign ? "Important Note:" : "ملاحظة هامة:"}</b><br/>
            {isForeign ? "Please attach a clear image of the payment receipt after completing the transfer to complete the booking confirmation process." : "يرجى إرفاق صورة واضحة من إيصال الدفع بعد إتمام عملية التحويل، لاستكمال إجراءات تأكيد الحجز."}
          </div>
          
          <hr style={{border:'none', borderTop:'1px dashed #E5C76B', margin:'15px 0'}}/>
          <div style={{textAlign:'center'}}>
            <b>{isForeign ? "Need Help?" : "هل تحتاج إلى مساعدة؟"}</b><br/>
            <span style={{fontSize:'13px', lineHeight:'1.6', display:'block', margin:'8px 0'}}>
              {isForeign ? "If you do not want to complete the payment now, or you faced any issue during payment, or you have any additional inquiries, you can contact us via WhatsApp at:" : "إذا كنت لا ترغب في إتمام عملية الدفع حالياً، أو واجهتك أي مشكلة أثناء عملية الدفع، أو لديك أي استفسارات إضافية، يمكنك التواصل معنا عبر واتساب من خلال الرقم التالي:"}
            </span>
            <a href="https://wa.me/201119947744" target="_blank" rel="noreferrer" style={{display:'inline-block', background:'#25D366', color:'white', padding:'10px 18px', borderRadius:'20px', textDecoration:'none', fontWeight:'bold'}}>📱 011119947744</a><br/><br/>
            <small>{isForeign ? "We are happy to help you." : "يسعدنا مساعدتك والإجابة عن جميع استفساراتك."}</small>
          </div>
          <div style={{marginTop:'15px'}}><b>{isForeign ? "Upload Clear Receipt Image *" : "رفع صورة الإيصال *"}</b><br/><input type="file" accept="image/*" onChange={(e)=>{ handleFileChange(e); track("3.5- Uploaded Receipt"); }} />{data.previewUrl && <div style={{marginTop:'10px'}}><img src={data.previewUrl} alt="preview" style={{maxWidth:'100%', maxHeight:'250px', borderRadius:'8px', border:'2px solid #1A3A6D'}} /></div>}</div>
        </div>

        <button className="btn-primary" onClick={handleFinalSubmit} disabled={sending || !!validationError} style={{opacity: (sending || !!validationError) ? 0.5 : 1}}>
          {sending ? (isForeign ? "Sending..." : "جاري الإرسال...") : (isForeign ? "Submit Request" : "إرسال الطلب")}
          {validationError && <><br/><small>{validationError}</small></>}
        </button>
        {validationError && <p style={{color:'#D32F2F', fontSize:'12px', textAlign:'center', marginTop:'8px'}}>⚠️ {validationError}</p>}
      </div>}

      {step===4 && <div className="card" style={{textAlign:'center'}}><h2 style={{color:'#7CB342'}}>✅ {isForeign ? "Received" : "تم الاستلام"}</h2><p>{isForeign ? "We will contact you via WhatsApp" : "سيتم التواصل معك عبر الواتساب"}</p></div>}
    </div>
  );
}