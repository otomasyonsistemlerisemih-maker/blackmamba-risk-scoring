import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List
from dotenv import load_dotenv
from google.antigravity import Agent, LocalAgentConfig, BuiltinTools
from google.antigravity.types import CapabilitiesConfig, QuestionHookResult, QuestionResponse
from google.antigravity.hooks import hooks

class HITLInteractionHook(hooks.OnInteractionHook):
    def __init__(self, ek_bilgi: str | None):
        self.ek_bilgi = ek_bilgi
        self.triggered_question = None

    async def run(self, context: hooks.HookContext, data: Any) -> QuestionHookResult:
        question_text = data.questions[0].question if data.questions else "Ek teminat veya fatura açıklaması gerekiyor."
        if self.ek_bilgi:
            return QuestionHookResult(
                responses=[QuestionResponse(freeform_response=self.ek_bilgi)]
            )
        self.triggered_question = question_text
        return QuestionHookResult(
            responses=[QuestionResponse(skipped=True)]
        )

# Load GEMINI_API_KEY from ~/.env (local) or from environment variable (cloud)
env_path = Path.home() / ".env"
if env_path.exists():
    load_dotenv(env_path)

app = FastAPI(title="Dinamik Çek Skorlama API", version="1.0.0")

# Frontend (Next.js) bağlantısı için CORS izinleri
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # MVP aşamasında her yere açık, yayına alırken kısıtlanacak
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. VERİ MODELLERİ (API İSTEK VE CEVAP KONTRATLARI) ---

class SkorlamaIsteği(BaseModel):
    mevcut_bakiye: float = Field(..., json_schema_extra={"example": 150000.00})
    cek_tutari: float = Field(..., json_schema_extra={"example": 85000.00})
    sektor: str = Field("Tekstil", json_schema_extra={"example": "Tekstil"})
    stres_testi_aktif_mi: bool = Field(False, json_schema_extra={"example": False})
    stres_senaryo_tipi: str = Field("TAHSILAT_GECIKMESI", json_schema_extra={"example": "TAHSILAT_GECIKMESI"})
    ek_bilgi: str | None = Field(None, json_schema_extra={"example": "Şirketin 50.000 TL değerinde teminat mektubu bulunmaktadır."})
    stres_tahsilat_gecikme_orani: float | None = Field(None, json_schema_extra={"example": 0.3})
    stres_tahsilat_gecikme_gun: int | None = Field(None, json_schema_extra={"example": 15})
    stres_gider_artis_orani: float | None = Field(None, json_schema_extra={"example": 0.2})
    stres_kaybolacak_gelir_aciklamasi: str | None = Field(None, json_schema_extra={"example": "Jolly Tur"})

# Agent için sınıflandırma çıktı modeli
class AgentIslemKategoriDetay(BaseModel):
    islem_id: str = Field(description="İşlemin benzersiz kimliği")
    kategori: str = Field(description="DÜZENLİ_GİDER, DEĞİŞKEN_GİDER, DÜZENLİ_GELİR, DÖNEMSEL_GELİR, vb.")
    periyodik_mi: bool = Field(description="İşlemin periyodik olarak tekrarlanıp tekrarlanmadığı")
    guven_skoru: int = Field(description="Sınıflandırma güven skoru (0-100 arası)")
    anomali_mi: bool = Field(description="İşlemin tutar veya sıklık olarak olağan dışı büyük/beklenmedik olup olmadığı")
    mevsimsellik_etkisi: str = Field(description="Varsa dönemsel/mevsimsel yığılma veya azalma açıklaması, yoksa boş")

class AgentSiniflandiriciCikti(BaseModel):
    analiz_edilen_islemler: List[AgentIslemKategoriDetay]
    tespit_edilen_anomaliler_ve_mevsimsel_donguler: str = Field(description="Genel mevsimsellik ve anomali tespiti açıklaması")

class IslemKategoriDetay(BaseModel):
    islem_id: str
    tarih: str
    tutar: float
    aciklama: str
    kategori: str
    periyodik_mi: bool
    guven_skoru: int
    anomali_mi: bool = Field(description="İşlemin olağan dışı büyük veya tek seferlik olup olmadığı")
    mevsimsellik_etkisi: str = Field(description="Varsa dönemsel/mevsimsel yığılma veya azalma açıklaması, yoksa boş")

class SiniflandiriciCikti(BaseModel):
    analiz_edilen_islemler: List[IslemKategoriDetay]
    tespit_edilen_anomaliler_ve_mevsimsel_donguler: str = Field(description="Genel mevsimsellik ve anomali tespiti açıklaması")

class TahminCikti(BaseModel):
    gunluk_nakit_yakma_hizi: float
    beklenen_180_gunluk_gelir: float
    beklenen_180_gunluk_gider: float
    hedef_tarihteki_tahmini_bakiye: float
    stres_senaryosu_tahmini_bakiye: float = Field(description="Tahsilat gecikmeleri ve kriz simülasyonu sonrasındaki bakiye")
    stres_testi_gerekcesi: str = Field(description="Uygulanan kriz senaryosunun açıklaması ve finansal etkisi")
    mevsimsel_ve_anomali_etkisi_aciklamasi: str = Field(description="Mevsimsellik ve anomalilerin 180 günlük projeksiyona ve yakma hızına olan etkisi açıklaması")
    nakit_darbogazi_riski_var_mi: bool
    gunluk_normal_bakiye_serisi: List[float] = Field(description="180 gün boyunca gün gün normal senaryodaki kasa bakiyeleri (liste uzunluğu tam 180 olmalıdır)")
    gunluk_stres_bakiye_serisi: List[float] = Field(description="180 gün boyunca gün gün stres senaryosundaki kasa bakiyeleri (liste uzunluğu tam 180 olmalıdır)")

class SektorAnalizCikti(BaseModel):
    sektor_risk_derecesi: str = Field(description="DÜŞÜK, ORTA, YÜKSEK")
    sektorel_trendler_ozeti: str = Field(description="Sektörel ve makroekonomik analiz özeti")
    risk_carpan_etkisi: float = Field(description="Güven skoru çarpanı (0.5 - 1.2 arası. Örn: 0.8 katsayısı güven skorunu %20 düşürür, 1.0 nötrdür)")

class NihaiRaporCikti(BaseModel):
    dinamik_guven_skoru: int
    risk_kategorisi: str
    karsilama_orani: float
    gerekce_ozeti: str
    ek_bilgi_talebi: bool = Field(False, description="Kullanıcıdan ek teminat veya bilgi isteniyor mu?")
    ek_bilgi_sorusu: str | None = Field(None, description="Kullanıcıya yöneltilecek ek bilgi sorusu")

class FullSkorlamaYaniti(BaseModel):
    siniflandirma: SiniflandiriciCikti
    tahmin: TahminCikti
    sektor_analizi: SektorAnalizCikti
    nihai_rapor: NihaiRaporCikti


# --- 2. YARDIMCI FONKSİYON ---
def veri_setini_yukle(sektor: str):
    if sektor == "Turizm":
        dosya_adi = "turizm_oteli.json"
    elif sektor == "Perakende":
        dosya_adi = "perakende_magazasi.json"
    elif sektor == "Gida":
        dosya_adi = "gida_tarim.json"
    else:
        dosya_adi = "saglam_sirket.json"
    
    dosya_yolu = Path(__file__).parent / dosya_adi
    if not dosya_yolu.exists():
        dosya_yolu = Path(dosya_adi)
        
    with open(dosya_yolu, "r", encoding="utf-8") as f:
        return json.dumps(json.load(f), ensure_ascii=False)


# --- 3. API ENDPOINT (SKORLAMA MERKEZİ) ---
@app.post("/api/skorla", response_model=FullSkorlamaYaniti)
async def cek_skorla(istek: SkorlamaIsteği):
    try:
        ham_banka_verisi = veri_setini_yukle(istek.sektor)

        # Ajan 1: Sınıflandırıcı (Mevsimsellik ve Anomali tespiti dahil)
        siniflandirici_talimati = (
            "Sen uzman finansal veri sınıflandırıcısısın. İşlemleri DÜZENLİ_GİDER, DEĞİŞKEN_GİDER, "
            "DÜZENLİ_GELİR, vb. olarak ayır.\n"
            "Ayrıca işlemlerdeki aşağıdaki özellikleri tespit et:\n"
            "1. ANOMALİLER (anomali_mi): Normal işlem hacminin çok üzerinde olan tek seferlik devasa harcamaları veya gelirleri "
            "(örneğin, bir anda yapılan büyük bir demirbaş alımı, olağan dışı vergi cezası ödemesi veya tek seferlik tasfiye geliri) tespit et ve anomali_mi=True olarak işaretle.\n"
            "2. MEVSİMSELLİK (mevsimsellik_etkisi): İşlemin mevsimsel/dönemsel bir yığılma veya azalışa ait olup olmadığını belirt "
            "(örneğin, turizm şirketinin yaz aylarındaki yüksek gelirleri veya kışın yapılan bakım giderleri; tarım şirketinin hasat dönemi gelirleri). Varsa detaylı açıklama yaz, yoksa boş bırak."
        )
        config_1 = LocalAgentConfig(
            system_instructions=siniflandirici_talimati,
            model="gemini-3.1-flash-lite",
            response_schema=AgentSiniflandiriciCikti,
            capabilities=CapabilitiesConfig(enabled_tools=[]),
        )

        print("🔄 [Adım 1/4] Veri Sınıflandırıcı ham verileri analiz ediyor (Mevsimsellik & Anomaliler)...")
        async with Agent(config_1) as veri_siniflandirici_ajan:
            response_1 = await veri_siniflandirici_ajan.chat(f"Ham veriler:\n{ham_banka_verisi}")
            agent_siniflandirma_yaniti = await response_1.structured_output()

        # Merge agent classification with raw transaction details
        raw_tx_map = {tx["islem_id"]: tx for tx in json.loads(ham_banka_verisi)}
        analiz_edilen_islemler = []
        for x in agent_siniflandirma_yaniti.get("analiz_edilen_islemler", []):
            raw_tx = raw_tx_map.get(x.get("islem_id"), {})
            analiz_edilen_islemler.append({
                "islem_id": x.get("islem_id"),
                "tarih": raw_tx.get("tarih", ""),
                "tutar": raw_tx.get("tutar", 0.0),
                "aciklama": raw_tx.get("aciklama", ""),
                "kategori": x.get("kategori"),
                "periyodik_mi": x.get("periyodik_mi"),
                "guven_skoru": x.get("guven_skoru"),
                "anomali_mi": x.get("anomali_mi"),
                "mevsimsellik_etkisi": x.get("mevsimsellik_etkisi")
            })
        siniflandirici_yaniti = {
            "analiz_edilen_islemler": analiz_edilen_islemler,
            "tespit_edilen_anomaliler_ve_mevsimsel_donguler": agent_siniflandirma_yaniti.get("tespit_edilen_anomaliler_ve_mevsimsel_donguler", "")
        }

        # Ajan 4: Sektör & Makroekonomi Ajanı
        sektor_talimati = (
            "Sen makroekonomi ve sektörel risk analizi uzmanısın. Belirtilen sektörü ve makroekonomik konjonktürü "
            "incele. Sektör risk derecesini belirle ve nihai güven skoruna etkisini risk_carpan_etkisi olarak "
            "yansıt (0.5 - 1.2 arası, riskli sektörler için 0.5-0.8 arası, nötr/düşük riskli sektörler için 1.0-1.2 arası)."
        )
        config_4 = LocalAgentConfig(
            system_instructions=sektor_talimati,
            model="gemini-3.1-flash-lite",
            response_schema=SektorAnalizCikti,
            capabilities=CapabilitiesConfig(enabled_tools=[]),
        )

        print(f"🌍 [Adım 2/4] Sektör & Makroekonomi Ajanı sektörü analiz ediyor: {istek.sektor}...")
        async with Agent(config_4) as sektor_ajani:
            response_4 = await sektor_ajani.chat(f"Analiz edilecek sektör: {istek.sektor}")
            sektor_yaniti = await response_4.structured_output()

        # Ajan 2: Zaman Serisi ve Tahmin (Stres Testi, Mevsimsellik ve Anomali Dahil)
        tahmin_talimati = (
            "Sınıflandırılmış işlemlere ve kasa bakiyesine dayanarak 180 günlük projeksiyon yap. Günlük nakit yakma hızını hesapla. "
            "Ayrıca, şirketin ait olduğu sektörün mevsimsel özelliklerini ve geçmiş sınıflandırmadaki mevsimsel eğilimler ile anomalileri analiz et:\n"
            "1. ANOMALİLER: Geçmiş sınıflandırmada anomali_mi=True olan tek seferlik olağan dışı büyük gelir veya giderleri tespit et. "
            "Bu işlemleri geleceğe yönelik düzenli/rutin nakit yakma hızı (gunluk_nakit_yakma_hizi) hesabına dahil ETME, projeksiyonu bozmasınlar.\n"
            "2. MEVSİMSELLİK: Şirketin faaliyet gösterdiği sektörü (Örn: Turizm, Tarım/Gıda, Perakende) ve sektörel analiz sonuçlarını incele. "
            "Eğer şirket mevsimsel etkilere çok açık bir sektördeyse ve önümüzdeki 180 gün düşük sezona denk geliyorsa (örneğin yazlık bir otel için sonbahar/kış dönemi ise), "
            "180 günlük beklenen gelirleri muhafazakar bir yaklaşımla düşür. Yüksek sezona giriliyorsa artır. "
            "Elde ettiğin mevsimsellik ve anomali tespiti bulgularını ve bunların projeksiyona etkisini mevsimsel_ve_anomali_etkisi_aciklamasi alanına detaylı yaz. Mevsimsel bir sektör değilse bunu da belirt.\n"
            "3. STRES TESTİ: Eğer stres testi aktif ise, belirtilen stres senaryo tipine göre kötü senaryo simülasyonu gerçekleştir:\n"
            "- TAHSILAT_GECIKMESI: Tahsilatların (gelirlerin) %30'unun 15 gün gecikeceğini varsay.\n"
            "- MUSTERI_KAYBI: En büyük gelir kaynağının (tahsilatının) iptal olacağını / gelmeyeceğini varsay.\n"
            "- MALIYET_ARTISI: Düzenli ve değişken giderlerin %20 artacağını varsay.\n"
            "- OZEL: Kullanıcının girdiği Özel Stres Parametrelerini simüle et:\n"
            "  * Tahsilat Gecikme Oranı ve Gecikme Süresi verilmişse: Projeksiyondaki gelirlerin bu orandaki kısmının belirtilen gün sayısı kadar gecikeceğini varsayarak nakit akışı stres bakiyesini hesapla.\n"
            "  * Gider Artış Oranı verilmişse: Projeksiyon süresindeki tüm giderlerin bu oranda artacağını varsay.\n"
            "  * İptal Olacak Gelir Açıklaması verilmişse: Açıklamasında bu metin geçen tüm tahsilatların iptal olacağını varsayarak bakiyeyi düşür.\n"
            "stres_senaryosu_tahmini_bakiye değerini bu kriz simülasyonu sonrasındaki bakiye olarak hesapla. "
            "Aktif değilse veya senaryo tipi NORMAL/belirtilmemiş ise normal bakiye ile aynı tut. "
            "Simülasyonun gerekçesini ve finansal detayını tahmin çıktısındaki stres_testi_gerekcesi alanına yaz.\n"
            "4. GÜNLÜK SERİ TAHMİNLERİ:\n"
            "- Projeksiyonun her günü için (1. günden 180. güne kadar) kasa bakiyesi gelişim serisini hesapla.\n"
            "- gunluk_normal_bakiye_serisi listesini doldur. 1. gün bakiye mevcut_bakiye + (1 günlük net değişim) şeklinde başlamalı ve 180. günde hedef_tarihteki_tahmini_bakiye değerine ulaşmalıdır. Liste uzunluğu tam 180 olmalıdır.\n"
            "- gunluk_stres_bakiye_serisi listesini doldur. Eğer stres testi aktif ise normal seriyle aynı olmalıdır. Aktif ise kriz parametreleri uygulanmış haldeki gün gün bakiyeleri içermeli ve 180. günde stres_senaryosu_tahmini_bakiye değerine ulaşmalıdır. Liste uzunluğu tam 180 olmalıdır."
        )
        config_2 = LocalAgentConfig(
            system_instructions=tahmin_talimati,
            model="gemini-3.1-flash-lite",
            response_schema=TahminCikti,
            capabilities=CapabilitiesConfig(enabled_tools=[]),
        )

        print("📈 [Adım 3/4] Tahmin Ajanı 180 günlük projeksiyonu hesaplıyor (Stres Testi ve Mevsimsellik simülasyonuyla)...")
        ajan2_girdi = (
            f"Mevcut Bakiye: {istek.mevcut_bakiye}\n"
            f"Stres Testi Aktif mi: {istek.stres_testi_aktif_mi}\n"
            f"Stres Senaryo Tipi: {istek.stres_senaryo_tipi}\n"
            f"Şirket Sektörü: {istek.sektor}\n"
            f"Özel Stres Parametreleri:\n"
            f"  - Tahsilat Gecikme Oranı: {istek.stres_tahsilat_gecikme_orani}\n"
            f"  - Tahsilat Gecikme Süresi (Gün): {istek.stres_tahsilat_gecikme_gun}\n"
            f"  - Gider Artış Oranı: {istek.stres_gider_artis_orani}\n"
            f"  - İptal Olacak Gelir Açıklaması: {istek.stres_kaybolacak_gelir_aciklamasi}\n"
            f"Sektörel ve Makro Trend Analizi: {json.dumps(sektor_yaniti, ensure_ascii=False)}\n"
            f"Geçmiş Sınıflandırma ve Mevsimsellik/Anomali Tespitleri: {json.dumps(siniflandirici_yaniti, ensure_ascii=False)}"
        )
        async with Agent(config_2) as tahmin_ajani:
            response_2 = await tahmin_ajani.chat(ajan2_girdi)
            tahmin_yaniti = await response_2.structured_output()

        # Enforce exactly 180 elements in daily projection series (dict/object safe)
        is_dict = isinstance(tahmin_yaniti, dict)
        normal_series = tahmin_yaniti["gunluk_normal_bakiye_serisi"] if is_dict else tahmin_yaniti.gunluk_normal_bakiye_serisi
        stres_series = tahmin_yaniti["gunluk_stres_bakiye_serisi"] if is_dict else tahmin_yaniti.gunluk_stres_bakiye_serisi

        if len(normal_series) > 180:
            normal_series = normal_series[:180]
        elif len(normal_series) < 180:
            diff = 180 - len(normal_series)
            last_val = normal_series[-1] if normal_series else istek.mevcut_bakiye
            normal_series.extend([last_val] * diff)

        if len(stres_series) > 180:
            stres_series = stres_series[:180]
        elif len(stres_series) < 180:
            diff = 180 - len(stres_series)
            last_val = stres_series[-1] if stres_series else istek.mevcut_bakiye
            stres_series.extend([last_val] * diff)

        if is_dict:
            tahmin_yaniti["gunluk_normal_bakiye_serisi"] = normal_series
            tahmin_yaniti["gunluk_stres_bakiye_serisi"] = stres_series
        else:
            tahmin_yaniti.gunluk_normal_bakiye_serisi = normal_series
            tahmin_yaniti.gunluk_stres_bakiye_serisi = stres_series

        # Ajan 3: Skorlama ve Risk (İnsan Karar Döngüsü / HITL Dahil)
        skorlama_talimati = (
            "Sen B2B kredi risk analizi yapan baş denetçisin. Şirketin 180 günlük nakit projeksiyonunu "
            "(stres senaryolarını, sektörel mevsimsel likidite döngülerini ve anomalilerden arındırılmış nakit akışını da göz önüne alarak), "
            "sektörel risk çarpanını ve varsa kullanıcının sağladığı ek teminat/bilgileri incele. Vadeli çekin ödenme ihtimalini 0 ile 100 arasında puanla.\n"
            "Eğer mevsimsellik nedeniyle gelecek 180 günde nakit akışının aniden kesilme riski varsa (Örn: Turizm sektöründe kış dönemi), skoru buna göre daha muhafazakar belirle. "
            "Sektörel risk çarpanını (risk_carpan_etkisi) nihai skora mutlaka yansıt (örneğin katsayıyla skoru çarp).\n"
            "Eğer stres testi aktif ise, nihai puanı hesaplarken normal senaryo yerine stres senaryosu bakiyesini (stres_senaryosu_tahmini_bakiye) ve darboğaz riskini temel al.\n"
            "Eğer hesaplanan ilk skor 50'nin altındaysa ve henüz ek bilgi girilmemişse, mutlaka ask_question aracını kullanarak kullanıcıdan ek teminat veya fatura açıklaması talep et. "
            "Eğer ek bilgi zaten girilmişse bunu skorlamayı iyileştirmek için kullan ve ek_bilgi_talebi=False yap. "
            "Gerekçeyi Türkçe ve profesyonel yaz."
        )
        config_3 = LocalAgentConfig(
            system_instructions=skorlama_talimati,
            model="gemini-3.1-flash-lite",
            response_schema=NihaiRaporCikti,
            capabilities=CapabilitiesConfig(enabled_tools=["ask_question"]),
            hooks=[hitl_hook := HITLInteractionHook(istek.ek_bilgi)]
        )

        print("🎯 [Adım 4/4] Skorlama Ajanı nihai risk analizini gerçekleştiriyor (HITL değerlendirmesiyle)...")
        ajan3_girdi = (
            f"Sorgulanan Çek Tutarı: {istek.cek_tutari} TL\n"
            f"180 Günlük Projeksiyon: {json.dumps(tahmin_yaniti, ensure_ascii=False)}\n"
            f"Sektör Analizi: {json.dumps(sektor_yaniti, ensure_ascii=False)}\n"
            f"Kullanıcının Sağladığı Ek Bilgi/Teminat: {istek.ek_bilgi or 'Henüz girilmedi'}"
        )
        async with Agent(config_3) as skorlama_ajani:
            response_3 = await skorlama_ajani.chat(ajan3_girdi)
            skorlama_yaniti = await response_3.structured_output()

        if hitl_hook.triggered_question is not None:
            skorlama_yaniti = {
                "dinamik_guven_skoru": 0,
                "risk_kategorisi": "YÜKSEK_RİSK",
                "karsilama_orani": 0.0,
                "gerekce_ozeti": "Dinamik Güven Skoru 50'nin altında kaldığı için İnsan Karar Döngüsü (HITL) tetiklendi ve ek bilgi talep ediliyor.",
                "ek_bilgi_talebi": True,
                "ek_bilgi_sorusu": hitl_hook.triggered_question
            }

        return FullSkorlamaYaniti(
            siniflandirma=siniflandirici_yaniti,
            tahmin=tahmin_yaniti,
            sektor_analizi=sektor_yaniti,
            nihai_rapor=skorlama_yaniti
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


