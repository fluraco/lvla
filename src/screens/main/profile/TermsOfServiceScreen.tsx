import React from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ScaledText } from '../../../components/common/ScaledText';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../../theme';

export function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  // Geri butonu
  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : SPACING.md }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.dark.text} />
        </TouchableOpacity>
        <ScaledText style={styles.headerTitle}>Kullanım Şartları</ScaledText>
        <View style={styles.rightPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>1. Kabul Edilen Şartlar</ScaledText>
          <ScaledText style={styles.sectionText}>
            Lovla uygulamasını kullanarak, bu Kullanım Şartları'nı kabul etmiş olursunuz. Eğer bu şartları kabul etmiyorsanız, lütfen uygulamayı kullanmayı bırakın.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>2. Hesap Oluşturma</ScaledText>
          <ScaledText style={styles.sectionText}>
            Lovla'yı kullanabilmek için bir hesap oluşturmanız gerekmektedir. Hesap oluştururken verdiğiniz bilgilerin doğru, güncel ve eksiksiz olması gerekmektedir. Hesabınızın güvenliğinden yalnızca siz sorumlusunuz.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>3. Kullanıcı Sorumluluğu</ScaledText>
          <ScaledText style={styles.sectionText}>
            Lovla'yı kullanırken diğer kullanıcılara saygılı olmanız, yasalara uygun davranmanız ve platformun güvenliğini tehdit eden davranışlardan kaçınmanız gerekmektedir. Diğer kullanıcıları taciz etmek, tehdit etmek veya rahatsız etmek kesinlikle yasaktır.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>4. İçerik Politikası</ScaledText>
          <ScaledText style={styles.sectionText}>
            Profil fotoğrafları, açıklamalar ve mesajlar dahil olmak üzere, uygulama içinde paylaştığınız tüm içeriklerden siz sorumlusunuz. Telif hakkı ihlali içeren, yasadışı, müstehcen veya zararlı içerikler paylaşmak yasaktır.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>5. Ödeme ve Abonelikler</ScaledText>
          <ScaledText style={styles.sectionText}>
            Lovla'da sunulan premium özelliklere erişmek için ücretli abonelikler satın alabilirsiniz. Abonelikler otomatik olarak yenilenir ve iptal edilmedikçe ücretlendirilmeye devam eder. Aboneliğinizi dilediğiniz zaman hesap ayarlarınızdan iptal edebilirsiniz.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>6. Uygulamayı Kullanım Kısıtlamaları</ScaledText>
          <ScaledText style={styles.sectionText}>
            Lovla'yı tersine mühendislik yapmak, kaynak kodunu çıkarmak, değiştirmek veya ticari amaçlarla kullanmak yasaktır. Uygulama yalnızca kişisel kullanım için lisanslanmıştır.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>7. Hesap İptali</ScaledText>
          <ScaledText style={styles.sectionText}>
            Hesabınızı dilediğiniz zaman uygulama içinden iptal edebilirsiniz. Hesap iptali durumunda, bazı kişisel verileriniz yasal gerekliliklere uygun olarak belirli bir süre saklanabilir.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>8. Değişiklikler</ScaledText>
          <ScaledText style={styles.sectionText}>
            Lovla, bu Kullanım Şartları'nı herhangi bir zamanda değiştirme hakkını saklı tutar. Değişiklikler uygulama içinde bildirilecek ve değişikliklerin yürürlüğe girmesinden sonra uygulamayı kullanmaya devam etmeniz, güncellenmiş şartları kabul ettiğiniz anlamına gelecektir.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>9. Sorumluluk Reddi</ScaledText>
          <ScaledText style={styles.sectionText}>
            Lovla, uygulama üzerinden yapılan etkileşimlerden veya diğer kullanıcıların davranışlarından sorumlu değildir. Uygulamayı kendi riskinizle kullanırsınız.
          </ScaledText>
        </View>

        <View style={styles.section}>
          <ScaledText style={styles.sectionTitle}>10. İletişim</ScaledText>
          <ScaledText style={styles.sectionText}>
            Bu Kullanım Şartları ile ilgili sorularınız için lovla.iletisim@gmail.com adresine e-posta gönderebilirsiniz.
          </ScaledText>
        </View>

        <View style={styles.lastUpdated}>
          <ScaledText style={styles.lastUpdatedText}>
            Son Güncelleme: 1 Kasım 2023
          </ScaledText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.dark.border,
  },
  backButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.h3.fontSize,
    fontWeight: 'bold',
    color: COLORS.dark.text,
  },
  rightPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.subtitle1.fontSize,
    fontWeight: 'bold',
    color: COLORS.dark.text,
    marginBottom: SPACING.sm,
  },
  sectionText: {
    fontSize: TYPOGRAPHY.body2.fontSize,
    lineHeight: 22,
    color: COLORS.dark.textSecondary,
  },
  lastUpdated: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    color: COLORS.dark.textSecondary,
    fontStyle: 'italic',
  },
}); 