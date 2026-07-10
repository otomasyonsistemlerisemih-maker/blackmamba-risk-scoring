"use client";

import { useState } from "react";

export default function Home() {
  const [bakiye, setBakiye] = useState<number>(150000);
  const [cekTutari, setCekTutari] = useState<number>(85000);
  const [sektor, setSektor] = useState<string>("Tekstil");
  const [stresTesti, setStresTesti] = useState<boolean>(false);
  const [stresSenaryoTipi, setStresSenaryoTipi] = useState<string>("TAHSILAT_GECIKMESI");
  const [ekBilgi, setEkBilgi] = useState<string>("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  
  // Custom stress scenario states
  const [stresTahsilatGecikmeOrani, setStresTahsilatGecikmeOrani] = useState<number>(30);
  const [stresTahsilatGecikmeGun, setStresTahsilatGecikmeGun] = useState<number>(15);
  const [stresGiderArtisOrani, setStresGiderArtisOrani] = useState<number>(20);
  const [stresKaybolacakGelirAciklamasi, setStresKaybolacakGelirAciklamasi] = useState<string>("");
  const [cekVadesi, setCekVadesi] = useState<number>(30);
  
  const [sonuc, setSonuc] = useState<any>(null);
  const [yukleniyor, setYukleniyor] = useState<boolean>(false);
  const [analizAdimi, setAnalizAdimi] = useState<number>(0);
  const [hata, setHata] = useState<string>("");

  const sektorler = [
    { id: "Tekstil", name: "Tekstil (Orta-Yüksek Risk)" },
    { id: "Insaat", name: "İnşaat (Yüksek Risk)" },
    { id: "Teknoloji", name: "Teknoloji (Düşük Risk)" },
    { id: "Gida", name: "Gıda & Tarım (Düşük-Orta Risk)" },
    { id: "Turizm", name: "Turizm (Mevsimsel/Orta Risk)" },
    { id: "Otomotiv", name: "Otomotiv (Orta Risk)" },
    { id: "Perakende", name: "Perakende (Orta Risk)" }
  ];

  const skorla = async (overrideEkBilgi?: string) => {
    setYukleniyor(true);
    setHata("");
    if (!overrideEkBilgi) {
      setSonuc(null);
    }
    setAnalizAdimi(1); // Klasifikasyon başladı

    try {
      // Adımları simüle et
      await new Promise(r => setTimeout(r, 800));
      setAnalizAdimi(2); // Sektörel analiz başladı
      
      await new Promise(r => setTimeout(r, 800));
      setAnalizAdimi(3); // Projeksiyon başladı
      
      await new Promise(r => setTimeout(r, 800));
      setAnalizAdimi(4); // Nihai skorlama başladı
      
      await new Promise(r => setTimeout(r, 600));

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/skorla`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mevcut_bakiye: bakiye,
          cek_tutari: cekTutari,
          sektor: sektor,
          stres_testi_aktif_mi: stresTesti,
          stres_senaryo_tipi: stresSenaryoTipi,
          ek_bilgi: overrideEkBilgi !== undefined ? overrideEkBilgi : ekBilgi,
          stres_tahsilat_gecikme_orani: stresSenaryoTipi === "OZEL" ? stresTahsilatGecikmeOrani / 100 : null,
          stres_tahsilat_gecikme_gun: stresSenaryoTipi === "OZEL" ? stresTahsilatGecikmeGun : null,
          stres_gider_artis_orani: stresSenaryoTipi === "OZEL" ? stresGiderArtisOrani / 100 : null,
          stres_kaybolacak_gelir_aciklamasi: stresSenaryoTipi === "OZEL" ? (stresKaybolacakGelirAciklamasi || null) : null
        }),
      });

      if (!response.ok) throw new Error("Skorlama sırasında sunucu hatası oluştu.");
      
      const data = await response.json();
      setSonuc(data);
      setAnalizAdimi(5); // Tamamlandı
    } catch (err: any) {
      setHata(err.message);
      setAnalizAdimi(0);
    } finally {
      setYukleniyor(false);
    }
  };

  const raporuYazdir = () => {
    if (!sonuc) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Lütfen pop-up engelleyicinizi kapatın.");
      return;
    }

    const { nihai_rapor, tahmin, sektor_analizi, siniflandirma } = sonuc;
    const bugun = new Date().toLocaleDateString("tr-TR");

    const html = `
      <html>
        <head>
          <title>Mamba Kredi Risk Analiz Raporu - ${nihai_rapor.dinamik_guven_skoru}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.5;
              background-color: #ffffff;
            }
            .header {
              border-bottom: 2px solid #6366f1;
              padding-bottom: 15px;
              margin-bottom: 25px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .title-group h1 {
              font-size: 24px;
              font-weight: 700;
              margin: 0 0 5px 0;
              color: #1e1b4b;
            }
            .title-group p {
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin: 0;
            }
            .meta-info {
              text-align: right;
              font-size: 11px;
              color: #64748b;
            }
            .meta-info strong {
              color: #1e293b;
            }
            .grid {
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
            }
            .card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              background-color: #f8fafc;
            }
            .card-title {
              font-size: 11px;
              font-weight: 700;
              color: #4f46e5;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 0 0 12px 0;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
            }
            .score-badge-group {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 15px;
            }
            .score-circle {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              border: 4px solid #6366f1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background-color: white;
            }
            .score-num {
              font-size: 28px;
              font-weight: 700;
              color: #1e1b4b;
            }
            .score-lbl {
              font-size: 8px;
              color: #64748b;
              font-weight: 600;
            }
            .risk-category {
              font-size: 14px;
              font-weight: 700;
              padding: 6px 12px;
              border-radius: 8px;
              text-transform: uppercase;
              border: 1px solid;
            }
            .risk-LOW {
              color: #047857;
              background-color: #ecfdf5;
              border-color: #a7f3d0;
            }
            .risk-MEDIUM {
              color: #b45309;
              background-color: #fffbeb;
              border-color: #fde68a;
            }
            .risk-HIGH {
              color: #b91c1c;
              background-color: #fef2f2;
              border-color: #fecaca;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              margin-bottom: 8px;
              border-bottom: 1px dashed #e2e8f0;
              padding-bottom: 4px;
            }
            .detail-row span {
              color: #64748b;
            }
            .detail-row strong {
              color: #0f172a;
            }
            .justification-box {
              font-size: 12px;
              background: #f1f5f9;
              border-left: 4px solid #4f46e5;
              padding: 12px;
              border-radius: 0 8px 8px 0;
              color: #334155;
              margin-top: 10px;
              font-style: italic;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              font-size: 11px;
            }
            th {
              background-color: #f1f5f9;
              color: #475569;
              font-weight: 600;
              text-align: left;
              padding: 8px 10px;
              border-bottom: 2px solid #cbd5e1;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #e2e8f0;
              color: #334155;
            }
            .badge {
              font-size: 9px;
              padding: 2px 6px;
              border-radius: 4px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .badge-anomali {
              background-color: #fee2e2;
              color: #ef4444;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #1e1b4b;
              margin: 30px 0 10px 0;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 4px;
            }
            .signatures {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #64748b;
            }
            .signature-box {
              width: 200px;
              text-align: center;
              border-top: 1px solid #cbd5e1;
              padding-top: 8px;
            }
            @media print {
              body { margin: 20px; }
              button { display: none; }
              .card { page-break-inside: avoid; }
              .section-title { page-break-inside: avoid; }
              table { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title-group">
              <p>MAMBA DİNAMİK RİSK DEĞERLENDİRME PLATFORMU</p>
              <h1>KREDİ RİSK ANALİZ RAPORU</h1>
            </div>
            <div class="meta-info">
              Rapor Tarihi: <strong>${bugun}</strong><br/>
              Sorgulanan Sektör: <strong>${sektor}</strong><br/>
              Analiz Durumu: <strong>ONAYLI / RESMİ</strong>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Nihai Değerlendirme Özeti</div>
              <div class="score-badge-group">
                <div class="score-circle">
                  <span class="score-num">${nihai_rapor.dinamik_guven_skoru}</span>
                  <span class="score-lbl">GÜVEN SKORU</span>
                </div>
                <span class="risk-badge risk-${nihai_rapor.risk_kategorisi.includes('DÜŞÜK') ? 'LOW' : nihai_rapor.risk_kategorisi.includes('ORTA') ? 'MEDIUM' : 'HIGH'} risk-category">
                  ${nihai_rapor.risk_kategorisi.replace('_', ' ')}
                </span>
              </div>
              <div class="detail-row">
                <span>Sorgulanan Çek Tutarı:</span>
                <strong>${cekTutari.toLocaleString('tr-TR')} TL</strong>
              </div>
              <div class="detail-row">
                <span>Kasa Karşılama Oranı:</span>
                <strong>%${(nihai_rapor.karsilama_orani * 100).toFixed(1)}</strong>
              </div>
              <div class="detail-row">
                <span>Çek Vade Günü:</span>
                <strong>${cekVadesi}. Gün</strong>
              </div>
              
              <div class="card-title" style="margin-top: 15px;">Denetçi Gerekçe Raporu</div>
              <div class="justification-box">
                "${nihai_rapor.gerekce_ozeti}"
              </div>
            </div>

            <div class="card">
              <div class="card-title">180 Günlük Nakit Akış Öngörüleri</div>
              <div class="detail-row">
                <span>Mevcut Kasa Bakiyesi:</span>
                <strong>${bakiye.toLocaleString('tr-TR')} TL</strong>
              </div>
              <div class="detail-row">
                <span>Günlük Nakit Yakma Hızı:</span>
                <strong>${tahmin.gunluk_nakit_yakma_hizi.toLocaleString('tr-TR')} TL</strong>
              </div>
              <div class="detail-row">
                <span>180 Günlük Beklenen Gelir:</span>
                <strong>+${tahmin.beklenen_180_gunluk_gelir.toLocaleString('tr-TR')} TL</strong>
              </div>
              <div class="detail-row">
                <span>180 Günlük Beklenen Gider:</span>
                <strong>-${tahmin.beklenen_180_gunluk_gider.toLocaleString('tr-TR')} TL</strong>
              </div>
              <div class="detail-row">
                <span>Vade Günündeki Tahmini Bakiye (Gün ${cekVadesi}):</span>
                <strong>${(tahmin.gunluk_normal_bakiye_serisi ? tahmin.gunluk_normal_bakiye_serisi[Math.min(tahmin.gunluk_normal_bakiye_serisi.length - 1, cekVadesi - 1)] : 0).toLocaleString('tr-TR')} TL</strong>
              </div>
              <div class="detail-row">
                <span>Vade Günündeki Stres Bakiyesi (Gün ${cekVadesi}):</span>
                <strong>${(tahmin.gunluk_stres_bakiye_serisi ? tahmin.gunluk_stres_bakiye_serisi[Math.min(tahmin.gunluk_stres_bakiye_serisi.length - 1, cekVadesi - 1)] : 0).toLocaleString('tr-TR')} TL</strong>
              </div>
              <div class="detail-row">
                <span>Nakit Darboğazı Riski:</span>
                <strong style="color: ${tahmin.nakit_darbogazi_riski_var_mi ? '#ef4444' : '#10b981'}">
                  ${tahmin.nakit_darbogazi_riski_var_mi ? 'MEVCUT' : 'YOK'}
                </strong>
              </div>

              <div class="card-title" style="margin-top: 15px;">Sektörel Risk Çarpan Etkisi</div>
              <div class="detail-row">
                <span>Sektör Risk Seviyesi:</span>
                <strong>${sektor_analizi.sektor_risk_derecesi}</strong>
              </div>
              <div class="detail-row">
                <span>Sektör Çarpan Katsayısı:</span>
                <strong>x${sektor_analizi.risk_carpan_etkisi}</strong>
              </div>
            </div>
          </div>

          <div class="section-title">Finansal Projeksiyon & Sektörel Yorumlar</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 20px; line-height: 1.6;">
            <strong>Mevsimsellik & Anomali Detayı:</strong> ${tahmin.mevsimsel_ve_anomali_etkisi_aciklamasi || "Yok"}<br/><br/>
            ${stresTesti ? `<strong>Stres Testi Simülasyonu Gerekçesi:</strong> ${tahmin.stres_testi_gerekcesi || "Yok"}` : ""}
          </div>

          <div class="section-title">Hesap Hareketleri Analizi (Anomaliler ve Sınıflandırma)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 15%">Tarih</th>
                <th style="width: 15%">İşlem ID</th>
                <th style="width: 35%">Açıklama</th>
                <th style="width: 15%; text-align: right;">Tutar</th>
                <th style="width: 12%">Kategori</th>
                <th style="width: 8%">Özellik</th>
              </tr>
            </thead>
            <tbody>
              ${(siniflandirma.analiz_edilen_islemler || []).map((txn: any) => `
                <tr>
                  <td>${txn.tarih}</td>
                  <td><code>${txn.islem_id}</code></td>
                  <td>${txn.aciklama}</td>
                  <td style="text-align: right; font-weight: 600; color: ${txn.tutar >= 0 ? '#047857' : '#0f172a'}">
                    ${txn.tutar >= 0 ? '+' : ''}${txn.tutar.toLocaleString('tr-TR')} TL
                  </td>
                  <td>${txn.kategori.replace('_', ' ')}</td>
                  <td>
                    ${txn.anomali_mi ? '<span class="badge badge-anomali">Anomali</span>' : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="signatures">
            <div class="signature-box">
              <strong>Risk Yönetim Birimi</strong><br/><br/><br/>
              İmza / Kaşe
            </div>
            <div class="signature-box">
              <strong>Kredi Risk Komitesi Başkanı</strong><br/><br/><br/>
              İmza / Kaşe
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // SVG Radial Meter ayarları
  const radius = 80;
  const circumference = 2 * Math.PI * radius; // ~502.65
  const strokeDashoffset = sonuc
    ? circumference - (sonuc.nihai_rapor.dinamik_guven_skoru / 100) * circumference
    : circumference;

  // Risk rengi seçici
  const getRiskColor = (risk: string) => {
    if (risk === "DÜŞÜK_RİSK") return { text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", stroke: "#10b981" };
    if (risk === "ORTA_RİSK") return { text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", stroke: "#f59e0b" };
    return { text: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", stroke: "#ef4444" };
  };

  const riskColor = sonuc ? getRiskColor(sonuc.nihai_rapor.risk_kategorisi) : { text: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20", stroke: "#9ca3af" };

  return (
    <div className="min-h-screen bg-[#060713] text-white font-sans flex flex-col items-center justify-start p-4 md:p-8 relative overflow-hidden">
      {/* Premium Arka Plan Glow Efektleri */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="w-full max-w-6xl relative z-10">
        {/* Header / Logo */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/[0.06] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-violet-500 glow-primary animate-pulse"></span>
              <span className="text-xs uppercase tracking-widest text-violet-400 font-semibold">Mamba Dynamic Risk Scoring</span>
            </div>
            <h1 className="text-3xl font-light tracking-tight">
              Dinamik Çek <span className="font-semibold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Skorlama & Analiz</span>
            </h1>
          </div>
          <div className="mt-4 md:mt-0 text-left md:text-right">
            <span className="text-xs text-gray-500 block">Sistem Durumu</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 justify-start md:justify-end">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> 4 Aktif Ajan Çevrimiçi
            </span>
          </div>
        </header>

        {/* Ana grid düzeni */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Sol Sütun: Girdiler & Ajan Akış Hattı */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            
            {/* Girdi Parametreleri Paneli */}
            <div className="glass-card p-6 md:p-8">
              <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2 border-b border-white/[0.06] pb-4">
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
                Analiz Girdileri
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="form-label">Sorgulanan Çek Tutarı (TL)</label>
                  <input
                    type="number"
                    value={cekTutari}
                    onChange={(e) => setCekTutari(Number(e.target.value))}
                    className="form-input"
                    placeholder="Örn: 85000"
                  />
                </div>
                <div>
                  <label className="form-label">Güncel Kasa Bakiyesi (TL)</label>
                  <input
                    type="number"
                    value={bakiye}
                    onChange={(e) => setBakiye(Number(e.target.value))}
                    className="form-input"
                    placeholder="Örn: 150000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="form-label">Sektörel Faaliyet Alanı</label>
                  <select
                    value={sektor}
                    onChange={(e) => setSektor(e.target.value)}
                    className="form-input appearance-none bg-[#111422]"
                  >
                    {sektorler.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex flex-col justify-end">
                  <div className="flex items-center justify-between border border-white/[0.08] rounded-xl p-3 bg-white/[0.01] hover:border-violet-500/30 transition-colors h-[54px]">
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white">Stres Testi Modu</span>
                      <span className="text-[10px] text-gray-500">
                        {stresTesti
                          ? stresSenaryoTipi === "TAHSILAT_GECIKMESI"
                            ? "Tahsilat Gecikmesi Simülasyonu"
                            : stresSenaryoTipi === "MUSTERI_KAYBI"
                            ? "Müşteri Kaybı Simülasyonu"
                            : "Maliyet Artışı Simülasyonu"
                          : "Negatif kriz senaryolarını simüle et"}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stresTesti}
                        onChange={(e) => setStresTesti(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <label className="form-label flex justify-between items-center">
                  <span>Sorgulanan Çekin Vadesi (Gün)</span>
                  <span className="text-violet-400 font-semibold">{cekVadesi}. Gün</span>
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="180"
                    value={cekVadesi}
                    onChange={(e) => setCekVadesi(Number(e.target.value))}
                    className="flex-1 accent-violet-500 cursor-pointer h-2 bg-white/10 rounded-lg appearance-none animate-pulse"
                  />
                  <span className="text-xs text-gray-400 min-w-[50px] text-right">180 Gün</span>
                </div>
              </div>

              {stresTesti && (
                <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="form-label text-rose-400 flex items-center gap-1.5 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    Stres Senaryo Tipi Seçimi
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setStresSenaryoTipi("TAHSILAT_GECIKMESI")}
                      className={`p-3 rounded-lg border text-left transition-all ${stresSenaryoTipi === "TAHSILAT_GECIKMESI" ? "bg-rose-500/10 border-rose-500 text-white font-medium shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "bg-black/20 border-white/[0.08] text-gray-400 hover:border-white/20"}`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider mb-1">Tahsilat Gecikmesi</div>
                      <div className="text-[10px] text-gray-500 leading-tight">%30 tahsilatın 15 gün gecikeceğini simüle eder.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStresSenaryoTipi("MUSTERI_KAYBI")}
                      className={`p-3 rounded-lg border text-left transition-all ${stresSenaryoTipi === "MUSTERI_KAYBI" ? "bg-rose-500/10 border-rose-500 text-white font-medium shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "bg-black/20 border-white/[0.08] text-gray-400 hover:border-white/20"}`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider mb-1">Müşteri Kaybı</div>
                      <div className="text-[10px] text-gray-500 leading-tight">En büyük gelir kaynağının iptal olacağını simüle eder.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStresSenaryoTipi("MALIYET_ARTISI")}
                      className={`p-3 rounded-lg border text-left transition-all ${stresSenaryoTipi === "MALIYET_ARTISI" ? "bg-rose-500/10 border-rose-500 text-white font-medium shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "bg-black/20 border-white/[0.08] text-gray-400 hover:border-white/20"}`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider mb-1">Maliyet Artışı</div>
                      <div className="text-[10px] text-gray-500 leading-tight">Giderlerin %20 artacağını simüle eder.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStresSenaryoTipi("OZEL")}
                      className={`p-3 rounded-lg border text-left transition-all ${stresSenaryoTipi === "OZEL" ? "bg-rose-500/10 border-rose-500 text-white font-medium shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "bg-black/20 border-white/[0.08] text-gray-400 hover:border-white/20"}`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wider mb-1">Özel Senaryo</div>
                      <div className="text-[10px] text-gray-500 leading-tight">Kendi kriz oranlarınızı ve parametrelerinizi belirleyin.</div>
                    </button>
                  </div>

                  {stresSenaryoTipi === "OZEL" && (
                    <div className="mt-4 p-4 border border-white/[0.06] bg-white/[0.01] rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Tahsilat Gecikme Oranı: %{stresTahsilatGecikmeOrani}</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={stresTahsilatGecikmeOrani}
                            onChange={(e) => setStresTahsilatGecikmeOrani(Number(e.target.value))}
                            className="w-full accent-rose-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Gecikme Süresi: {stresTahsilatGecikmeGun} Gün</label>
                          <input
                            type="range"
                            min="1"
                            max="180"
                            value={stresTahsilatGecikmeGun}
                            onChange={(e) => setStresTahsilatGecikmeGun(Number(e.target.value))}
                            className="w-full accent-rose-500 cursor-pointer"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Gider Artış Oranı: %{stresGiderArtisOrani}</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={stresGiderArtisOrani}
                            onChange={(e) => setStresGiderArtisOrani(Number(e.target.value))}
                            className="w-full accent-rose-500 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">Kaybedilecek Gelir Açıklaması (Metin Eşleme)</label>
                          <input
                            type="text"
                            value={stresKaybolacakGelirAciklamasi}
                            onChange={(e) => setStresKaybolacakGelirAciklamasi(e.target.value)}
                            placeholder="Örn: Jolly Tur, ETS, tasfiye..."
                            className="form-input text-xs py-1.5 border-white/[0.08] bg-black/40 focus:border-rose-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <label className="form-label">Ek Teminat / Bilgi / Açıklama (İsteğe Bağlı)</label>
                <textarea
                  value={ekBilgi}
                  onChange={(e) => setEkBilgi(e.target.value)}
                  className="form-input min-h-[80px] py-3 resize-none"
                  placeholder="Ek teminat mektubu, bloke çek, güçlü cari borç/alacak teyitleri veya faturalar..."
                />
              </div>

              <button
                onClick={() => skorla()}
                disabled={yukleniyor}
                className="btn-primary w-full"
              >
                {yukleniyor ? (
                  <>
                    <span className="spinner"></span>
                    Ajanlar Analiz Ediyor...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    Çek Ödeme Güven Skorunu Hesapla
                  </>
                )}
              </button>
            </div>

            {/* Ajan İşlem Pipeline Görselleştirmesi */}
            {(yukleniyor || sonuc) && (
              <div className="glass-card p-6 md:p-8">
                <h3 className="text-base font-medium text-white mb-6 flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  Yapay Zeka Çoklu Ajan Konsantrasyon Hattı (Pipeline)
                </h3>

                <div className="step-container relative pl-4 before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/[0.06]">
                  {/* Step 1: Sınıflandırıcı */}
                  <div className={`step-row ${analizAdimi === 1 ? "active" : ""} ${analizAdimi > 1 ? "completed" : ""}`}>
                    <div className="step-indicator">
                      {analizAdimi > 1 ? "✓" : "1"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">Adım 1: Finansal Veri Sınıflandırıcı</h4>
                        {analizAdimi === 1 && <span className="spinner text-violet-400"></span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {analizAdimi === 1 ? "Ham banka hesap hareketleri sınıflandırılıyor..." : ""}
                        {analizAdimi > 1 ? `Başarıyla tamamlandı. ${sonuc?.siniflandirma.analiz_edilen_islemler.length || 10} işlem düzenli/değişken gelir/gider olarak ayrıldı.` : ""}
                        {analizAdimi < 1 ? "Sıraya alındı." : ""}
                      </p>
                      {sonuc && (
                        <div className="mt-2 text-[10px] text-gray-500 bg-white/[0.02] border border-white/[0.04] rounded p-2">
                          <strong>Tespit Edilen Anomaliler & Mevsimsellik:</strong> {sonuc.siniflandirma.tespit_edilen_anomaliler_ve_mevsimsel_donguler}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Sektör & Makroekonomi Ajanı */}
                  <div className={`step-row ${analizAdimi === 2 ? "active" : ""} ${analizAdimi > 2 ? "completed" : ""}`}>
                    <div className="step-indicator">
                      {analizAdimi > 2 ? "✓" : "2"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">Adım 2: Sektör & Makroekonomi Ajanı</h4>
                        {analizAdimi === 2 && <span className="spinner text-violet-400"></span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {analizAdimi === 2 ? `${sektor} sektörü ve makroekonomik eğilimler analiz ediliyor...` : ""}
                        {analizAdimi > 2 ? `Sektörel risk belirlendi: ${sonuc?.sektor_analizi.sektor_risk_derecesi} risk. Risk Katsayısı: ${sonuc?.sektor_analizi.risk_carpan_etkisi}` : ""}
                        {analizAdimi < 2 ? "Sıraya alındı." : ""}
                      </p>
                      {sonuc && (
                        <div className="mt-2 text-[10px] text-gray-500 bg-white/[0.02] border border-white/[0.04] rounded p-2">
                          <strong>Makro Eğim & Konjonktür:</strong> {sonuc.sektor_analizi.sektorel_trendler_ozeti}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Zaman Serisi & Tahmin Ajanı */}
                  <div className={`step-row ${analizAdimi === 3 ? "active" : ""} ${analizAdimi > 3 ? "completed" : ""}`}>
                    <div className="step-indicator">
                      {analizAdimi > 3 ? "✓" : "3"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">Adım 3: Projeksiyon & Nakit Akışı Tahmin Ajanı</h4>
                        {analizAdimi === 3 && <span className="spinner text-violet-400"></span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {analizAdimi === 3 ? "45 günlük nakit projeksiyonu ve stres testi simülasyonu yapılıyor..." : ""}
                        {analizAdimi > 3 ? `45. Gün Projeksiyonu: ${sonuc?.tahmin.hedef_tarihteki_tahmini_bakiye.toLocaleString('tr-TR')} TL (Günlük Nakit Yakma Hızı: ${sonuc?.tahmin.gunluk_nakit_yakma_hizi.toLocaleString('tr-TR')} TL)` : ""}
                        {analizAdimi < 3 ? "Sıraya alındı." : ""}
                      </p>
                      {sonuc && (
                        <div className="mt-2 text-[10px] text-gray-500 bg-white/[0.02] border border-white/[0.04] rounded p-2 flex flex-col gap-1">
                          <div>
                            <strong>Stres Testi Bakiyesi:</strong> {sonuc.tahmin.stres_senaryosu_tahmini_bakiye.toLocaleString('tr-TR')} TL | <strong>Darböğaz Riski:</strong> {sonuc.tahmin.nakit_darbogazi_riski_var_mi ? "Var" : "Yok"}
                          </div>
                          {sonuc.tahmin.mevsimsel_ve_anomali_etkisi_aciklamasi && (
                            <div className="mt-1 text-cyan-400 border-t border-white/[0.04] pt-1 leading-normal">
                              <strong>Mevsimsellik/Anomali:</strong> {sonuc.tahmin.mevsimsel_ve_anomali_etkisi_aciklamasi.substring(0, 100)}...
                            </div>
                          )}
                          {sonuc.tahmin.stres_testi_gerekcesi && (
                            <div className="mt-1 text-gray-400 border-t border-white/[0.04] pt-1 leading-normal">
                              <strong>Stres Gerekçesi:</strong> {sonuc.tahmin.stres_testi_gerekcesi}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 4: Nihai Risk & Skorlama Ajanı */}
                  <div className={`step-row ${analizAdimi === 4 ? "active" : ""} ${analizAdimi > 4 ? "completed" : ""}`}>
                    <div className="step-indicator">
                      {analizAdimi > 4 ? "✓" : "4"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-white">Adım 4: Risk Denetim & Skorlama Ajanı</h4>
                        {analizAdimi === 4 && <span className="spinner text-violet-400"></span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {analizAdimi === 4 ? "Nakit akışı, sektörel çarpan ve stres sonuçları birleştirilerek skorlama yapılıyor..." : ""}
                        {analizAdimi > 4 ? `Nihai değerlendirme tamamlandı. Çek ödeme ihtimali hesaplandı.` : ""}
                        {analizAdimi < 4 ? "Sıraya alındı." : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sağ Sütun: Nihai Rapor ve Skorlama Sonuçları */}
          <div className="lg:col-span-5 flex flex-col gap-8">
            {hata && (
              <div className="glass-card border-rose-500/20 bg-rose-500/10 p-6 text-center">
                <span className="text-rose-400 font-medium block mb-2">Hata Oluştu</span>
                <p className="text-sm text-gray-300">{hata}</p>
              </div>
            )}

            {!sonuc && !yukleniyor && !hata && (
              <div className="glass-card p-8 text-center flex flex-col items-center justify-center min-h-[350px] border-dashed border-white/10">
                <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-4 text-violet-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">Analiz Bekleniyor</h3>
                <p className="text-xs text-gray-400 max-w-xs">
                  Sol paneldeki girdileri doldurarak Çoklu Ajan Analizini başlatın ve riski gerçek zamanlı simüle edin.
                </p>
              </div>
            )}

            {/* AI Ajan Yükleme İllüstrasyonu (İsteğe bağlı, animasyon hissi verir) */}
            {yukleniyor && !sonuc && (
              <div className="glass-card p-8 flex flex-col items-center justify-center min-h-[450px]">
                <div className="score-circle-container mb-6 flex items-center justify-center">
                  <div className="absolute inset-0 border-4 border-white/[0.02] rounded-full"></div>
                  <div className="w-32 h-32 rounded-full border-t-2 border-violet-500 animate-spin flex items-center justify-center">
                    <span className="text-xs font-semibold text-violet-400 animate-pulse">Tarama Yapılıyor</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">Ajanlar Karar Sürecinde</h3>
                <p className="text-xs text-gray-400 text-center max-w-xs">
                  Sektörel katsayılar, 45 günlük nakit akışı anomalileri ve stres senaryoları modeline göre verileriniz işleniyor.
                </p>
              </div>
            )}

            {/* Rapor Detayları */}
            {sonuc && (
              <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Güven Skoru & Karşılama Oranı */}
                <div className="glass-card p-6 md:p-8">
                  <div className="flex justify-between items-center mb-6 border-b border-white/[0.04] pb-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Nihai Değerlendirme Skoru</h3>
                    <button
                      onClick={raporuYazdir}
                      className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600 text-violet-400 hover:text-white border border-violet-500/20 hover:border-violet-500 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(139,92,246,0.1)] hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] animate-pulse"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                      Raporu Dışa Aktar
                    </button>
                  </div>
                  
                  <div className="score-circle-container mb-6">
                    <svg className="score-svg" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r={radius} className="score-circle-bg" />
                      <circle
                        cx="100"
                        cy="100"
                        r={radius}
                        className="score-circle-progress"
                        stroke={riskColor.stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                      />
                    </svg>
                    {/* İçerik */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold text-white leading-none">{sonuc.nihai_rapor.dinamik_guven_skoru}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-semibold">GÜVEN SKORU</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 mb-6">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${riskColor.bg} ${riskColor.text}`}>
                      {sonuc.nihai_rapor.risk_kategorisi.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-400">
                      Karşılama Oranı: <strong>%{(sonuc.nihai_rapor.karsilama_orani * 100).toFixed(1)}</strong>
                    </span>
                  </div>

                  <div className="border-t border-white/[0.06] pt-6">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Baş Denetçi Karar Gerekçesi</h4>
                    <p className="text-xs text-gray-200 leading-relaxed bg-white/[0.01] border border-white/[0.03] rounded-xl p-3.5">
                      {sonuc.nihai_rapor.gerekce_ozeti}
                    </p>
                  </div>
                </div>

                {/* HITL İnsan Karar Döngüsü Kartı */}
                {sonuc.nihai_rapor.ek_bilgi_talebi && (
                  <div className="glass-card border-amber-500/30 bg-amber-500/5 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/5 rounded-bl-full flex items-center justify-center text-amber-500">
                      <svg className="w-5 h-5 mr-[-6px] mt-[-6px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <span className="text-amber-400 font-bold text-xs uppercase tracking-widest block mb-2">İnsan-Karar Döngüsü (HITL) Tetiklendi</span>
                    <p className="text-xs text-amber-200/90 leading-relaxed mb-4">
                      <strong>Ajan Talebi:</strong> {sonuc.nihai_rapor.ek_bilgi_sorusu}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cevabınızı girin (Örn: 50.000 TL teminat mektubu eklendi)..."
                        className="form-input text-xs flex-1 border-amber-500/20 bg-black/40 focus:border-amber-400"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            skorla((e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.currentTarget.previousSibling as HTMLInputElement);
                          skorla(input.value);
                        }}
                        className="px-4 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-xl transition-all"
                      >
                        Gönder
                      </button>
                    </div>
                  </div>
                )}

                {/* 45 Günlük Projeksiyon SVG Trend Çizgisi */}
                <div className="glass-card p-6">
                  <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    Nakit Akışı ve Projeksiyon Grafiği
                  </h4>
                  
                  {(() => {
                    const normalSeries = sonuc.tahmin.gunluk_normal_bakiye_serisi || [];
                    const stresSeries = sonuc.tahmin.gunluk_stres_bakiye_serisi || [];
                    if (normalSeries.length === 0) return <p className="text-xs text-gray-500 text-center py-8">Grafik verisi bulunamadı.</p>;

                    const width = 500;
                    const height = 220;
                    const paddingLeft = 60;
                    const paddingRight = 20;
                    const paddingTop = 20;
                    const paddingBottom = 30;

                    const availW = width - paddingLeft - paddingRight;
                    const availH = height - paddingTop - paddingBottom;

                    const combined = [...normalSeries, ...stresSeries];
                    const rawMin = Math.min(...combined);
                    const yMin = Math.min(0, rawMin); // Her zaman 0 TL çizgisini gör
                    const yMax = Math.max(...combined) * 1.05 || 1000;

                    const getX = (index: number) => paddingLeft + (index / (normalSeries.length - 1)) * availW;
                    const getY = (val: number) => paddingTop + availH - ((val - yMin) / (yMax - yMin)) * availH;

                    const normalPoints = normalSeries.map((v: number, idx: number) => `${getX(idx)},${getY(v)}`).join(" ");
                    const stresPoints = stresSeries.map((v: number, idx: number) => `${getX(idx)},${getY(v)}`).join(" ");

                    const normalPath = `M ${normalPoints}`;
                    const stresPath = `M ${stresPoints}`;

                    const normalArea = `${normalPath} L ${getX(normalSeries.length - 1)},${getY(yMin)} L ${getX(0)},${getY(yMin)} Z`;
                    const stresArea = `${stresPath} L ${getX(stresSeries.length - 1)},${getY(yMin)} L ${getX(0)},${getY(yMin)} Z`;

                    const zeroY = getY(0);

                    return (
                      <div className="relative">
                        <svg
                          viewBox={`0 0 ${width} ${height}`}
                          className="w-full h-auto overflow-visible select-none"
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const relX = x - (paddingLeft / rect.width) * width;
                            const pct = relX / ((availW / width) * rect.width);
                            if (pct >= 0 && pct <= 1) {
                              const idx = Math.min(
                                normalSeries.length - 1,
                                Math.max(0, Math.round(pct * (normalSeries.length - 1)))
                              );
                              setHoverIndex(idx);
                            }
                          }}
                          onMouseLeave={() => setHoverIndex(null)}
                        >
                          <defs>
                            <linearGradient id="normalGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="stresGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                            </linearGradient>
                            
                            <filter id="glowNormal" x="-10%" y="-10%" width="120%" height="120%">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                            <filter id="glowStres" x="-10%" y="-10%" width="120%" height="120%">
                              <feGaussianBlur stdDeviation="3" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Grid Lines */}
                          <line x1={paddingLeft} y1={getY(yMax)} x2={width - paddingRight} y2={getY(yMax)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <line x1={paddingLeft} y1={getY(yMin)} x2={width - paddingRight} y2={getY(yMin)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                          <line x1={paddingLeft} y1={getY((yMax + yMin) / 2)} x2={width - paddingRight} y2={getY((yMax + yMin) / 2)} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                          {/* Zero Threshold Line */}
                          {yMin < 0 && (
                            <g>
                              <line
                                x1={paddingLeft}
                                y1={zeroY}
                                x2={width - paddingRight}
                                y2={zeroY}
                                stroke="#f43f5e"
                                strokeWidth="1.5"
                                strokeDasharray="3,3"
                                opacity="0.6"
                              />
                              <text
                                x={paddingLeft + 5}
                                y={zeroY - 4}
                                fill="#f43f5e"
                                fontSize="8"
                                className="font-semibold opacity-80"
                              >
                                DARBOĞAZ SINIRI (0 TL)
                              </text>
                            </g>
                          )}

                          {/* Çek Vadesi Dikey Çizgisi */}
                          {cekVadesi && normalSeries.length > 0 && (
                            <g>
                              <line
                                x1={getX(cekVadesi - 1)}
                                y1={paddingTop}
                                x2={getX(cekVadesi - 1)}
                                y2={height - paddingBottom}
                                stroke="#818cf8"
                                strokeWidth="1.5"
                                strokeDasharray="4,4"
                                opacity="0.8"
                              />
                              <circle
                                cx={getX(cekVadesi - 1)}
                                cy={getY(normalSeries[cekVadesi - 1])}
                                r="4.5"
                                fill="#818cf8"
                                stroke="#060713"
                                strokeWidth="1.5"
                                className="animate-pulse"
                              />
                              {stresTesti && stresSeries.length > 0 && (
                                <circle
                                  cx={getX(cekVadesi - 1)}
                                  cy={getY(stresSeries[cekVadesi - 1])}
                                  r="4"
                                  fill="#f43f5e"
                                  stroke="#060713"
                                  strokeWidth="1"
                                />
                              )}
                              <text
                                x={getX(cekVadesi - 1)}
                                y={paddingTop - 4}
                                fill="#818cf8"
                                fontSize="7"
                                textAnchor="middle"
                                className="font-bold tracking-wider"
                              >
                                Vade (Gün {cekVadesi})
                              </text>
                            </g>
                          )}

                          {/* Y-Axis labels */}
                          <text x={paddingLeft - 8} y={getY(yMax) + 4} fill="#6b7280" fontSize="8" textAnchor="end">
                            {yMax >= 1000000 ? `${(yMax / 1000000).toFixed(1)}M TL` : `${(yMax / 1000).toFixed(0)}k TL`}
                          </text>
                          <text x={paddingLeft - 8} y={getY((yMax + yMin) / 2) + 4} fill="#6b7280" fontSize="8" textAnchor="end">
                            {((yMax + yMin) / 2) >= 1000000 ? `${(((yMax + yMin) / 2) / 1000000).toFixed(1)}M TL` : `${(((yMax + yMin) / 2) / 1000).toFixed(0)}k TL`}
                          </text>
                          <text x={paddingLeft - 8} y={getY(yMin) - 4} fill="#6b7280" fontSize="8" textAnchor="end">
                            {yMin >= 0 ? "0 TL" : yMin <= -1000000 ? `${(yMin / 1000000).toFixed(1)}M TL` : `${(yMin / 1000).toFixed(0)}k TL`}
                          </text>

                          {/* X-Axis labels */}
                          <text x={getX(0)} y={height - 12} fill="#6b7280" fontSize="8" textAnchor="middle">
                            Gün 1
                          </text>
                          <text x={getX(44)} y={height - 12} fill="#6b7280" fontSize="8" textAnchor="middle">
                            Gün 45
                          </text>
                          <text x={getX(89)} y={height - 12} fill="#6b7280" fontSize="8" textAnchor="middle">
                            Gün 90
                          </text>
                          <text x={getX(134)} y={height - 12} fill="#6b7280" fontSize="8" textAnchor="middle">
                            Gün 135
                          </text>
                          <text x={getX(179)} y={height - 12} fill="#6b7280" fontSize="8" textAnchor="middle">
                            Gün 180
                          </text>

                          {/* Areas */}
                          <path d={normalArea} fill="url(#normalGrad)" />
                          {stresTesti && <path d={stresArea} fill="url(#stresGrad)" />}

                          {/* Lines */}
                          <path d={normalPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" filter="url(#glowNormal)" />
                          {stresTesti && (
                            <path d={stresPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" filter="url(#glowStres)" />
                          )}

                          {/* Hover Guide Line */}
                          {hoverIndex !== null && (
                            <g>
                              <line
                                x1={getX(hoverIndex)}
                                y1={paddingTop}
                                x2={getX(hoverIndex)}
                                y2={height - paddingBottom}
                                stroke="rgba(255,255,255,0.15)"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                              />
                              
                              <circle cx={getX(hoverIndex)} cy={getY(normalSeries[hoverIndex])} r="4" fill="#10b981" stroke="#060713" strokeWidth="1.5" />
                              {stresTesti && (
                                <circle cx={getX(hoverIndex)} cy={getY(stresSeries[hoverIndex])} r="4" fill="#ef4444" stroke="#060713" strokeWidth="1.5" />
                              )}
                            </g>
                          )}
                        </svg>

                        {/* Interactive Tooltip HUD */}
                        {hoverIndex !== null && (
                          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md border border-white/[0.08] rounded-xl p-3 text-[10px] space-y-1 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-100 min-w-[120px]">
                            <span className="font-semibold text-gray-400 block border-b border-white/[0.06] pb-1 mb-1">Gün {hoverIndex + 1} Bakiyesi</span>
                            <div className="flex justify-between items-center gap-4">
                              <span className="text-gray-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Normal:
                              </span>
                              <span className="font-bold text-white">{normalSeries[hoverIndex].toLocaleString('tr-TR')} TL</span>
                            </div>
                            {stresTesti && (
                              <div className="flex justify-between items-center gap-4">
                                <span className="text-gray-400 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Stresli:
                                </span>
                                <span className="font-bold text-rose-400">{stresSeries[hoverIndex].toLocaleString('tr-TR')} TL</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Legend */}
                        <div className="flex justify-center items-center gap-6 mt-2 pt-2 border-t border-white/[0.04] text-[10px] text-gray-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-1 rounded-full bg-emerald-500"></span> Normal Projeksiyon
                          </span>
                          {stresTesti && (
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-1 rounded-full bg-rose-500"></span> Stresli Projeksiyon ({stresSenaryoTipi.replace('_', ' ')})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Çek Vadesi Likidite Eşleşmesi HUD */}
                {sonuc && (() => {
                  const normalSeries = sonuc.tahmin.gunluk_normal_bakiye_serisi || [];
                  const stresSeries = sonuc.tahmin.gunluk_stres_bakiye_serisi || [];
                  if (normalSeries.length === 0) return null;

                  // Get cash balance on the selected check due date
                  const dayIdx = Math.min(normalSeries.length - 1, Math.max(0, cekVadesi - 1));
                  const normalBakiyeOnDue = normalSeries[dayIdx];
                  const stresBakiyeOnDue = stresSeries[dayIdx];

                  // Calculate coverage ratios
                  const normalCoverage = normalBakiyeOnDue / cekTutari;
                  const stresCoverage = stresBakiyeOnDue / cekTutari;

                  // Determine traffic-light status based on selected date
                  // Safe: normal coverage > 1.5
                  // Danger: normal coverage < 1.0 (cash is less than check amount in normal scenario!)
                  // Critical: in between, or if stress coverage is < 1.0
                  let status = "SAFE";
                  let statusColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
                  let statusGlow = "bg-emerald-500";
                  let statusTitle = "GÜVENLİ BÖLGE";
                  let statusDesc = `Çek vadesinde (${cekVadesi}. Gün) normal bakiye çek tutarını tamamen karşılamaktadır. Likidite yeterli seviyededir.`;

                  if (normalBakiyeOnDue < cekTutari) {
                    status = "DANGER";
                    statusColor = "text-rose-400 border-rose-500/20 bg-rose-500/5";
                    statusGlow = "bg-rose-500 animate-pulse";
                    statusTitle = "RİSKLİ EŞİK (DARBOĞAZ)";
                    statusDesc = `Çek vadesinde (${cekVadesi}. Gün) kasada net nakit açığı öngörülmektedir! Çekin geri dönme veya ödenmeme riski yüksektir.`;
                  } else if (normalCoverage <= 1.5 || stresBakiyeOnDue < cekTutari) {
                    status = "WARNING";
                    statusColor = "text-amber-400 border-amber-500/20 bg-amber-500/5";
                    statusGlow = "bg-amber-500";
                    statusTitle = "KRİTİK UYARI BÖLGESİ";
                    statusDesc = stresBakiyeOnDue < cekTutari
                      ? `Normal koşullarda bakiye yeterli ancak kriz/stres senaryosu altında (${cekVadesi}. Gün) kasada darboğaz yaşanabilir.`
                      : `Çek vadesinde (${cekVadesi}. Gün) kasa bakiyesi çek tutarını karşılıyor fakat yedek likidite marjı dar.`;
                  }

                  return (
                    <div className={`glass-card p-6 border transition-all duration-300 ${statusColor}`}>
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${statusGlow}`}></span>
                          <span className="text-xs font-bold uppercase tracking-widest">{statusTitle}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">Vade Günü: {cekVadesi}. Gün</span>
                      </div>

                      <p className="text-xs text-gray-200 leading-relaxed mb-4">
                        {statusDesc}
                      </p>

                      <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="bg-black/30 rounded-xl p-3 border border-white/[0.04]">
                          <span className="text-[9px] text-gray-500 block mb-1">NORMAL VADE BAKİYESİ</span>
                          <span className={`text-xs font-bold ${normalBakiyeOnDue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {normalBakiyeOnDue.toLocaleString('tr-TR')} TL
                          </span>
                          <span className="text-[9px] text-gray-400 block mt-1">
                            Karşılama: %{(normalCoverage * 100).toFixed(0)}
                          </span>
                        </div>
                        <div className="bg-black/30 rounded-xl p-3 border border-white/[0.04]">
                          <span className="text-[9px] text-gray-500 block mb-1">STRESLİ VADE BAKİYESİ</span>
                          <span className={`text-xs font-bold ${stresBakiyeOnDue >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {stresBakiyeOnDue.toLocaleString('tr-TR')} TL
                          </span>
                          <span className="text-[9px] text-gray-400 block mt-1">
                            Karşılama: %{(stresCoverage * 100).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Sektör Analiz Rapor Kartı */}
                <div className="glass-card p-6">
                  <h4 className="text-xs font-semibold text-violet-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 002 2h2m4-3.5a2 2 0 01-1.242-1.921 2 2 0 00-2.828-2.828l-1 1A2 2 0 0013 4.172V5a2 2 0 01-2 2h-.5a2 2 0 00-2 2v1a2 2 0 00-2 2v1m12 1a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Sektörel & Makroekonomik Analiz
                  </h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3">
                      <span className="text-[10px] text-gray-500 block mb-1">SEKTÖR RİSKİ</span>
                      <span className="text-xs font-semibold text-white">{sonuc.sektor_analizi.sektor_risk_derecesi}</span>
                    </div>
                    <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3">
                      <span className="text-[10px] text-gray-500 block mb-1">RİSK KATSAYISI (ÇARPAN)</span>
                      <span className="text-xs font-semibold text-white">x{sonuc.sektor_analizi.risk_carpan_etkisi}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed bg-white/[0.01] border border-white/[0.03] rounded-xl p-3">
                    {sonuc.sektor_analizi.sektorel_trendler_ozeti}
                  </p>
                </div>

                {/* Nakit Akış Tahmin Detay Kartı */}
                <div className="glass-card p-6">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    180 Günlük Nakit Akış Tahminleri
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/[0.01] border border-white/[0.04] rounded-xl p-3">
                      <span className="text-xs text-gray-400">Günlük Nakit Yakma Hızı</span>
                      <span className="text-xs font-medium text-white">{sonuc.tahmin.gunluk_nakit_yakma_hizi.toLocaleString('tr-TR')} TL</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/[0.01] border border-white/[0.04] rounded-xl p-3">
                      <span className="text-xs text-gray-400">Beklenen Toplam Gelir</span>
                      <span className="text-xs font-medium text-emerald-400">+{sonuc.tahmin.beklenen_180_gunluk_gelir.toLocaleString('tr-TR')} TL</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/[0.01] border border-white/[0.04] rounded-xl p-3">
                      <span className="text-xs text-gray-400">Beklenen Toplam Gider</span>
                      <span className="text-xs font-medium text-rose-400">-{sonuc.tahmin.beklenen_180_gunluk_gider.toLocaleString('tr-TR')} TL</span>
                    </div>
                    
                    {/* Normal vs Stres Test Karşılaştırması */}
                    <div className="border-t border-white/[0.06] pt-3 mt-1 grid grid-cols-2 gap-4">
                      <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3">
                        <span className="text-[10px] text-gray-500 block mb-1">TAHMİNİ BAKİYE</span>
                        <span className={`text-xs font-bold ${sonuc.tahmin.hedef_tarihteki_tahmini_bakiye >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {sonuc.tahmin.hedef_tarihteki_tahmini_bakiye.toLocaleString('tr-TR')} TL
                        </span>
                      </div>
                      <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-3">
                        <span className="text-[10px] text-gray-500 block mb-1">STRES TESTİ BAKİYESİ</span>
                        <span className={`text-xs font-bold ${sonuc.tahmin.stres_senaryosu_tahmini_bakiye >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {sonuc.tahmin.stres_senaryosu_tahmini_bakiye.toLocaleString('tr-TR')} TL
                        </span>
                      </div>
                    </div>
                    {sonuc.tahmin.mevsimsel_ve_anomali_etkisi_aciklamasi && (
                      <div className="mt-3 p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-cyan-200 text-xs leading-normal">
                        <strong className="block mb-1 text-cyan-400 uppercase tracking-wider text-[10px]">Mevsimsellik ve Anomali Analizi:</strong>
                        {sonuc.tahmin.mevsimsel_ve_anomali_etkisi_aciklamasi}
                      </div>
                    )}
                    {stresTesti && sonuc.tahmin.stres_testi_gerekcesi && (
                      <div className="mt-3 p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-200 text-xs leading-normal">
                        <strong className="block mb-1 text-rose-400 uppercase tracking-wider text-[10px]">Stres Testi Simülasyon Detayı:</strong>
                        {sonuc.tahmin.stres_testi_gerekcesi}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Banka Hesap Hareketleri ve Sınıflandırma Analizi Tablosu */}
        {sonuc && (
          <div className="glass-card p-6 md:p-8 mt-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
              <div>
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Banka Hesap Hareketleri ve Sınıflandırma Analizi
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Veri Sınıflandırıcı Ajan (Ajan 1) tarafından çözümlenen, anomali tespiti ve dönemsellik etki analizi yapılmış hesap hareketleri.
                </p>
              </div>
              <div className="mt-2 md:mt-0 bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-400">
                Toplam İşlem: <strong className="text-white">{sonuc.siniflandirma.analiz_edilen_islemler.length}</strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06] text-gray-400 text-[10px] uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Tarih</th>
                    <th className="pb-3 font-semibold">Açıklama</th>
                    <th className="pb-3 font-semibold text-right">Tutar</th>
                    <th className="pb-3 font-semibold text-center">Kategori</th>
                    <th className="pb-3 font-semibold text-center">Periyodik</th>
                    <th className="pb-3 font-semibold text-center">Güven Skoru</th>
                    <th className="pb-3 font-semibold text-center">Anomali mi?</th>
                    <th className="pb-3 font-semibold pl-4">Mevsimsellik Etkisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {sonuc.siniflandirma.analiz_edilen_islemler.map((tx: any) => {
                    const isIncome = tx.tutar > 0;
                    return (
                      <tr key={tx.islem_id} className={`hover:bg-white/[0.01] transition-colors ${tx.anomali_mi ? 'bg-rose-500/[0.02]' : ''}`}>
                        <td className="py-3.5 font-mono text-gray-400">{tx.tarih}</td>
                        <td className="py-3.5 text-white max-w-[200px] md:max-w-xs truncate" title={tx.aciklama}>
                          {tx.aciklama}
                        </td>
                        <td className={`py-3.5 text-right font-semibold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isIncome ? '+' : ''}{tx.tutar.toLocaleString('tr-TR')} TL
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${
                            tx.kategori.includes('GELİR') 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}>
                            {tx.kategori.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          <span className={`text-[10px] ${tx.periyodik_mi ? 'text-cyan-400 font-medium' : 'text-gray-500'}`}>
                            {tx.periyodik_mi ? 'Evet' : 'Hayır'}
                          </span>
                        </td>
                        <td className="py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-12 bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                              <div className="bg-violet-500 h-full" style={{ width: `${tx.guven_skoru}%` }}></div>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">{tx.guven_skoru}%</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-center">
                          {tx.anomali_mi ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 border border-rose-500/30 text-rose-400 shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse">
                              ⚠️ Anomali
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500">Normal</span>
                          )}
                        </td>
                        <td className="py-3.5 text-gray-300 leading-normal max-w-xs truncate pl-4" title={tx.mevsimsellik_etkisi}>
                          {tx.mevsimsellik_etkisi || (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
