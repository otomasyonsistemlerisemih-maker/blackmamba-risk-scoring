import asyncio
import json
from typing import List
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google.antigravity import Agent, LocalAgentConfig
from google.antigravity.types import CapabilitiesConfig
from google.antigravity.utils.interactive import AskQuestionHook

# Load GEMINI_API_KEY from ~/.env
load_dotenv(Path.home() / ".env")

# --- 1. AJAN ÇIKTI KONTRATLARI (PYDANTIC ŞEMALARI) ---

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
    islem_id: str = Field(description="İşlemin benzersiz kimliği")
    tarih: str = Field(description="İşlem tarihi (YYYY-MM-DD)")
    tutar: float = Field(description="İşlem tutarı")
    aciklama: str = Field(description="İşlem açıklaması")
    kategori: str = Field(description="DÜZENLİ_GİDER, DEĞİŞKEN_GİDER, DÜZENLİ_GELİR, vb.")
    periyodik_mi: bool = Field(description="İşlemin tekrarlanıp tekrarlanmadığı")
    guven_skoru: int = Field(description="Atanan kategoriye olan güven derecesi (0-100 arası)")
    anomali_mi: bool = Field(description="İşlemin olağan dışı büyük veya tek seferlik olup olmadığı")
    mevsimsellik_etkisi: str = Field(description="Varsa dönemsel/mevsimsel yığılma veya azalma açıklaması, yoksa boş")

class SiniflandiriciCikti(BaseModel):
    analiz_edilen_islemler: List[IslemKategoriDetay]
    tespit_edilen_anomaliler_ve_mevsimsel_donguler: str = Field(description="Genel mevsimsellik ve anomali tespiti açıklaması")

class TahminCikti(BaseModel):
    gunluk_nakit_yakma_hizi: float = Field(description="Günlük nakit çıkışı tutarı")
    beklenen_180_gunluk_gelir: float = Field(description="180 gün içinde öngörülen tahsilat")
    beklenen_180_gunluk_gider: float = Field(description="180 gün içinde öngörülen ödeme")
    hedef_tarihteki_tahmini_bakiye: float = Field(description="180. gündeki öngörülen net bakiye")
    stres_senaryosu_tahmini_bakiye: float = Field(description="Simüle edilen kriz senaryosu sonrasındaki bakiye")
    stres_testi_gerekcesi: str = Field(description="Uygulanan kriz senaryosunun açıklaması ve finansal etkisi")
    mevsimsel_ve_anomali_etkisi_aciklamasi: str = Field(description="Mevsimsellik ve anomalilerin 180 günlük projeksiyona ve yakma hızına olan etkisi açıklaması")
    nakit_darbogazi_riski_var_mi: bool = Field(description="Bakiye eksiye düşme riski taşıyor mu?")
    gunluk_normal_bakiye_serisi: List[float] = Field(description="180 gün boyunca gün gün normal senaryodaki kasa bakiyeleri (liste uzunluğu tam 180 olmalıdır)")
    gunluk_stres_bakiye_serisi: List[float] = Field(description="180 gün boyunca gün gün stres senaryosundaki kasa bakiyeleri (liste uzunluğu tam 180 olmalıdır)")

class SektorAnalizCikti(BaseModel):
    sektor_risk_derecesi: str = Field(description="DÜŞÜK, ORTA, YÜKSEK")
    sektorel_trendler_ozeti: str = Field(description="Sektörel ve makroekonomik analiz özeti")
    risk_carpan_etkisi: float = Field(description="Güven skoru çarpanı (0.5 - 1.2 arası. Örn: 0.8 katsayısı güven skorunu %20 düşürür, 1.0 nötrdür)")

# YENİ: Skorlama Ajanı Şeması
class SkorlamaCikti(BaseModel):
    dinamik_guven_skoru: int = Field(description="0-100 arası nihai çek ödeme ihtimali skoru")
    risk_kategorisi: str = Field(description="DÜŞÜK_RİSK, ORTA_RİSK veya YÜKSEK_RİSK")
    karsilama_orani: float = Field(description="Tahmini Bakiye / Çek Tutarı oranı")
    gerekce_ozeti: str = Field(description="Bu skorun neden verildiğini açıklayan profesyonel kısa metin")


# --- 2. YARDIMCI FONKSİYONLAR ---
def veri_setini_yukle(sektor: str) -> str:
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
        veri = json.load(f)
    return json.dumps(veri, ensure_ascii=False)


# --- 3. ANA ÇALIŞTIRMA SÜRECİ ---
async def main():
    sektor = "Turizm" # Test etmek istediğiniz sektörü seçin: Tekstil, Turizm, Perakende, Gida
    ham_banka_verisi = veri_setini_yukle(sektor)
    mevcut_bakiye = 150000.00 
    sorgulanan_cek_tutari = 250000.00 # Çeki alan firmanın sisteme girdiği tutar
    stres_testi_aktif_mi = True
    stres_senaryo_tipi = "MUSTERI_KAYBI" # Seçenekler: NORMAL, TAHSILAT_GECIKMESI, MUSTERI_KAYBI, MALIYET_ARTISI
    
    # --- AJAN 1: VERİ SINIFLANDIRICI ---
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

    print(f"🔄 [Adım 1/4] Veri Sınıflandırıcı ham veriyi analiz ediyor ({sektor} için)...")
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
    print("--- [Ajan 1 Çıktısı] ---")
    print(json.dumps(siniflandirici_yaniti, indent=2, ensure_ascii=False))

    # --- AJAN 2: SEKTÖR & MAKROEKONOMİ AJANI ---
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

    print(f"🌍 [Adım 2/4] Sektör & Makroekonomi Ajanı sektörü analiz ediyor: {sektor}...")
    async with Agent(config_4) as sektor_ajani:
        response_4 = await sektor_ajani.chat(f"Analiz edilecek sektör: {sektor}")
        sektor_yaniti = await response_4.structured_output()
    print("--- [Ajan 2 (Sektör) Çıktısı] ---")
    print(json.dumps(sektor_yaniti, indent=2, ensure_ascii=False))

    # --- AJAN 3: ZAMAN SERİSİ VE TAHMİN ---
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

    print("📈 [Adım 3/4] Tahmin Ajanı 180 günlük nakit projeksiyonunu hesaplıyor (Stres Testi simülasyonuyla)...")
    ajan2_girdi_verisi = f"""
    Mevcut Bakiye: {mevcut_bakiye}
    Stres Testi Aktif mi: {stres_testi_aktif_mi}
    Stres Senaryo Tipi: {stres_senaryo_tipi}
    Şirket Sektörü: {sektor}
    Özel Stres Parametreleri:
      - Tahsilat Gecikme Oranı: None
      - Tahsilat Gecikme Süresi (Gün): None
      - Gider Artış Oranı: None
      - İptal Olacak Gelir Açıklaması: None
    Sektörel ve Makro Trend Analizi: {json.dumps(sektor_yaniti, ensure_ascii=False)}
    Geçmiş Sınıflandırma ve Mevsimsellik/Anomali Tespitleri: {json.dumps(siniflandirici_yaniti, ensure_ascii=False)}
    """
    async with Agent(config_2) as tahmin_ajani:
        response_2 = await tahmin_ajani.chat(ajan2_girdi_verisi)
        tahmin_yaniti = await response_2.structured_output()
    print("--- [Ajan 3 (Tahmin) Çıktısı] ---")
    print(json.dumps(tahmin_yaniti, indent=2, ensure_ascii=False))

    # --- AJAN 4: SKORLAMA VE RİSK ---
    skorlama_talimati = """
    Sen B2B kredi risk analizi yapan baş denetçisin. Şirketin 180 günlük nakit projeksiyonunu (stres senaryolarını, sektörel mevsimsel likidite döngülerini ve anomalilerden arındırılmış nakit akışını da göz önüne alarak), sektörel risk çarpanını ve vadesi gelecek olan çekin tutarını inceleyerek, bu çekin ödenme ihtimalini 0 ile 100 arasında puanla.
    Eğer mevsimsellik nedeniyle gelecek 180 günde nakit akışının aniden kesilme riski varsa (Örn: Turizm sektöründe kış dönemi), skoru buna göre daha muhafazakar belirle.
    Sektörel risk çarpanını (risk_carpan_etkisi) nihai skora mutlaka yansıt (örneğin katsayıyla skoru çarp). Tahmini bakiye, çek tutarını rahatça karşılıyorsa skoru yüksek tut. Başa baş noktasındaysa risk marjını ekle. Bakiye negatifse skoru dibe çek. Mantıksal gerekçeni net bir dille özetle.
    Eğer hesaplanan ilk skor 50'nin altındaysa, mutlaka ask_question aracını kullanarak kullanıcıdan ek teminat veya fatura açıklaması talep et.
    """
    config_3 = LocalAgentConfig(
        system_instructions=skorlama_talimati,
        model="gemini-3.1-flash-lite",
        response_schema=SkorlamaCikti,
        capabilities=CapabilitiesConfig(enabled_tools=["ask_question"]),
        hooks=[AskQuestionHook()]
    )

    print("🎯 [Adım 4/4] Skorlama Ajanı nihai risk analizini gerçekleştiriyor...")
    ajan3_girdi_verisi = f"""
    Sorgulanan Çek Tutarı: {sorgulanan_cek_tutari} TL
    Stres Testi Aktif mi: {stres_testi_aktif_mi}
    180 Günlük Nakit Projeksiyonu: {json.dumps(tahmin_yaniti, ensure_ascii=False)}
    Sektör Analizi: {json.dumps(sektor_yaniti, ensure_ascii=False)}
    """
    async with Agent(config_3) as skorlama_ajani:
        response_3 = await skorlama_ajani.chat(ajan3_girdi_verisi)
        skorlama_yaniti = await response_3.structured_output()

    print("\n==================================================")
    print("🚀 NİHAİ DİNAMİK ÇEK SKORU VE RAPORU (STRES TESTİ DAHİL)")
    print("==================================================")
    print(json.dumps(skorlama_yaniti, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
