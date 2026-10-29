// ============================================
// 🐺 MA SÓI - RoleGuideModal Component
// Modal hiển thị danh sách các nhân vật và hướng dẫn chơi chi tiết
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { COLORS } from '../utils/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ROLES_INFO = [
  {
    id: 'wolf',
    name: 'Ma Sói',
    emoji: '🐺',
    team: 'Phe Ma Sói',
    teamColor: '#EF4444',
    teamEmoji: '🐺',
    slogan: 'KILL OR BE KILLED',
    objective: 'Tiêu diệt dân làng cho tới khi số lượng Ma Sói bằng hoặc áp đảo số người còn lại trong làng.',
    nightAction: 'Mỗi đêm (1p30s), thức dậy bí mật cùng đồng đội Sói, bàn chiến thuật trong kênh Hang Sói và bấm chọn con mồi (giống bỏ phiếu ban ngày). Người nhận nhiều phiếu nhất sẽ bị cắn khi hết giờ. Nạn nhân sẽ ngã xuống khi bình minh lên (trừ khi được Bảo Vệ hoặc Phù Thủy cứu).',
    dayAction: 'Ngụy trang thành Dân Làng vô tội, dẫn dắt các cuộc thảo luận, đánh lừa người khác và bỏ phiếu treo cổ Dân Làng.',
    tips: [
      'Giao tiếp thường xuyên trong kênh chat bí mật "Hang Sói".',
      'Đừng hùa theo vote quá vội vàng sẽ dễ bị Tiên Tri hoặc Dân Làng nghi ngờ.',
      'Sói có thể tự do đổi mục tiêu cắn bất cứ lúc nào.',
    ],
  },
  {
    id: 'witch',
    name: 'Phù Thủy',
    emoji: '🧙‍♀️',
    team: 'Phe Dân Làng',
    teamColor: '#A855F7',
    teamEmoji: '🕊️',
    slogan: 'MASTER OF POTIONS & LIFE',
    objective: 'Sở hữu 2 bình thuốc thần kì (Bình Cứu & Bình Độc) để xoay chuyển cục diện trận chiến.',
    nightAction: 'Thức dậy sau khi đàn Sói cắn người. Phù Thủy sẽ biết nạn nhân bị cắn đêm đó và có 2 lựa chọn: Dùng bình Cứu 🧪 để hồi sinh nạn nhân, hoặc dùng bình Độc ☠️ để hạ sát 1 kẻ tình nghi. Mỗi bình chỉ dùng được DUY NHẤT 1 LẦN trong cả trận đấu.',
    dayAction: 'Bảo vệ thông tin bí mật, tham gia thảo luận cùng Dân Làng và biểu quyết treo cổ Ma Sói.',
    tips: [
      'Bình Cứu rất quý giá, nên cân nhắc xem có nên cứu người bị cắn ngay đêm đầu hay giữ lại cho bản thân/Tiên Tri.',
      'Bình Độc có thể giết nhầm người vô tội, chỉ nên dùng khi đã có bằng chứng hoặc Tiên Tri đã chỉ điểm.',
      'Khi hết cả 2 bình thuốc, Phù Thủy sẽ ngủ yên suốt đêm.',
    ],
  },
  {
    id: 'seer',
    name: 'Tiên Tri',
    emoji: '🔮',
    team: 'Phe Dân Làng',
    teamColor: '#8B5CF6',
    teamEmoji: '🕊️',
    slogan: 'HELP YOUR TEAM WITH YOUR MAGIC',
    objective: 'Dùng nhãn quan ma thuật tìm ra toàn bộ Ma Sói và giúp Dân Làng treo cổ chúng.',
    nightAction: 'Sau khi đàn Sói cắn xong, Tiên Tri thức dậy và chọn 1 người chơi để soi quả cầu pha lê. Mắt thần sẽ báo kết quả mục tiêu thuộc "PHE ÁC" hay "PHE THIỆN".',
    dayAction: 'Dẫn dắt dân làng bỏ phiếu treo cổ kẻ gian xảo dựa trên thông tin soi được.',
    tips: [
      'Không nên công khai thân phận quá sớm vì Ma Sói sẽ ưu tiên cắn Tiên Tri vào đêm hôm sau.',
      'Tìm cách hướng sự chú ý của làng vào kẻ mà bạn đã soi ra là PHE ÁC.',
      'Sau khi soi xong, đồng hồ sẽ đếm ngược 5 giây để bạn ghi nhớ kết quả trước khi trời sáng.',
    ],
  },
  {
    id: 'bodyguard',
    name: 'Bảo Vệ',
    emoji: '🛡️',
    team: 'Phe Dân Làng',
    teamColor: '#0EA5E9',
    teamEmoji: '🕊️',
    slogan: 'SHIELD YOUR VILLAGE FROM CLAWS',
    objective: 'Bảo vệ dân làng và các nhân vật quan trọng khỏi nanh vuốt của Ma Sói mỗi đêm.',
    nightAction: 'Bảo Vệ thức dậy đầu tiên mỗi đêm (trước cả Ma Sói) và có 30 giây để chọn 1 người chơi che chở. Khi chọn mà không thay đổi thì trong 5s sẽ chuyển pha. Không chọn ai thì mất lượt bảo vệ đêm đó. Không thể bảo vệ cùng 1 người 2 đêm liên tiếp. Người được bảo vệ dù bị Sói cắn cũng sẽ được an toàn.',
    dayAction: 'Giấu kín thân phận, tham gia thảo luận cùng Dân Làng và biểu quyết treo cổ Ma Sói.',
    tips: [
      'Có thể tự bảo vệ bản thân khi cảm thấy mình đang bị Ma Sói nhắm đến, nhưng nhớ rằng không thể bảo vệ mình 2 đêm liền.',
      'Ưu tiên bảo vệ những người khả nghi là Tiên Tri hoặc người có ích cho làng.',
      'Khi chọn xong, đồng hồ sẽ tự động rút xuống 5 giây để chuyển tiếp nhanh chóng.',
    ],
  },
  {
    id: 'hunter',
    name: 'Thợ Săn',
    emoji: '🏹',
    team: 'Phe Dân Làng',
    teamColor: '#F59E0B',
    teamEmoji: '🕊️',
    slogan: 'ONE BULLET, ONE REVENGE',
    objective: 'Dùng phát súng báo thù cuối cùng để tiêu diệt một kẻ gian xảo khi ngã xuống.',
    nightAction: 'Ban đêm Thợ Săn ngủ yên. Nếu bị Ma Sói cắn tử nạn trong đêm, khi bình minh lên, Thợ Săn sẽ kích hoạt phát súng trăn trối (12 giây) để chọn và bắn hạ 1 người mang theo xuống mồ.',
    dayAction: 'Thảo luận sôi nổi cùng Dân Làng. Nếu bị treo cổ ban ngày, Thợ Săn được quyền nổ phát súng báo thù kéo theo 1 kẻ tình nghi trước khi tắt thở.',
    tips: [
      'Câu thoại kinh điển: "Sẽ có những con cá phải trả gió!".',
      'LƯU Ý CỰC KỲ QUAN TRỌNG: Nếu bị Phù Thủy ném thuốc độc trong đêm, độc dược ngấm vào người gây tê liệt toàn thân khiến Thợ Săn KHÔNG THỂ nổ súng!',
      'Nếu không chắc chắn ai là Sói, bạn có thể chọn "Bắn chỉ thiên (Bỏ qua)" để tránh bắn nhầm đồng đội.',
    ],
  },
  {
    id: 'villager',
    name: 'Dân Làng',
    emoji: '👨‍🌾',
    team: 'Phe Dân Làng',
    teamColor: '#10B981',
    teamEmoji: '🕊️',
    slogan: 'SURVIVE AND FIND THE WOLFS',
    objective: 'Bảo vệ ngôi làng, tìm ra tất cả Ma Sói và treo cổ chúng vào ban ngày.',
    nightAction: 'Ngủ say trong bình yên suốt đêm dài và cầu mong không bị Ma Sói chọn làm mồi.',
    dayAction: 'Thảo luận sôi nổi, quan sát biểu cảm, lời khai và hành vi bỏ phiếu của mọi người để tìm ra kẻ tình nghi.',
    tips: [
      'Lắng nghe kỹ những người nói chuyện mâu thuẫn hoặc đổi phiếu vào phút chót.',
      'Nếu không chắc chắn ai là Sói, bạn có thể chọn "Bỏ phiếu trắng" để tránh treo cổ nhầm người tốt.',
      'Đoàn kết và tin tưởng vào những suy luận logic.',
    ],
  },
];

export default function RoleGuideModal({ visible = false, onClose }) {
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const activeRole = ROLES_INFO[selectedRoleIndex];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerEmoji}>📖</Text>
              <Text style={styles.headerTitle}>HƯỚNG DẪN VAI TRÒ</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Role Tabs */}
          <View style={styles.tabsRow}>
            {ROLES_INFO.map((r, idx) => {
              const isActive = idx === selectedRoleIndex;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.tabItem,
                    isActive && { backgroundColor: r.teamColor + '30', borderColor: r.teamColor },
                  ]}
                  onPress={() => setSelectedRoleIndex(idx)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tabEmoji}>{r.emoji}</Text>
                  <Text style={[styles.tabText, isActive && { color: r.teamColor, fontWeight: '800' }]}>
                    {r.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Role Content Body */}
          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Banner vai trò */}
            <View style={[styles.roleHeroCard, { borderColor: activeRole.teamColor + '60' }]}>
              <View style={[styles.roleAvatarCircle, { backgroundColor: activeRole.teamColor + '25', borderColor: activeRole.teamColor }]}>
                <Text style={styles.roleBigEmoji}>{activeRole.emoji}</Text>
              </View>

              <View style={styles.roleHeroInfo}>
                <View style={styles.roleNameRow}>
                  <Text style={[styles.roleTitleName, { color: activeRole.teamColor }]}>
                    {activeRole.name}
                  </Text>
                  <View style={[styles.teamBadge, { backgroundColor: activeRole.teamColor + '25', borderColor: activeRole.teamColor }]}>
                    <Text style={[styles.teamBadgeText, { color: activeRole.teamColor }]}>
                      {activeRole.team} {activeRole.teamEmoji}
                    </Text>
                  </View>
                </View>

                {/* Slogan */}
                <View style={styles.sloganBadge}>
                  <Text style={styles.sloganText}>⚡ {activeRole.slogan}</Text>
                </View>
              </View>
            </View>

            {/* Chi tiết: Mục tiêu */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderIcon}>🎯</Text>
                <Text style={styles.sectionHeaderTitle}>Mục Tiêu Chiến Thắng</Text>
              </View>
              <Text style={styles.sectionText}>{activeRole.objective}</Text>
            </View>

            {/* Chi tiết: Ban đêm */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderIcon}>🌙</Text>
                <Text style={styles.sectionHeaderTitle}>Hành Động Ban Đêm</Text>
              </View>
              <Text style={styles.sectionText}>{activeRole.nightAction}</Text>
            </View>

            {/* Chi tiết: Ban ngày */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderIcon}>☀️</Text>
                <Text style={styles.sectionHeaderTitle}>Hành Động Ban Ngày</Text>
              </View>
              <Text style={styles.sectionText}>{activeRole.dayAction}</Text>
            </View>

            {/* Chi tiết: Mẹo chơi */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderIcon}>💡</Text>
                <Text style={styles.sectionHeaderTitle}>Mẹo Chơi Chiến Thuật</Text>
              </View>
              {activeRole.tips.map((tip, index) => (
                <View key={index} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            {/* Quy tắc Bỏ phiếu trắng & Bỏ qua vote */}
            <View style={[styles.sectionBox, styles.extraRuleBox]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderIcon}>⚖️</Text>
                <Text style={styles.sectionHeaderTitle}>Cơ Chế Bỏ Phiếu Mới</Text>
              </View>
              <Text style={styles.sectionText}>
                • <Text style={{ fontWeight: 'bold', color: '#FCD34D' }}>Bỏ phiếu trắng (Skip Vote):</Text> Người chơi có thể tích chọn "Bỏ phiếu trắng" nếu không muốn treo cổ ai. Nếu số phiếu trắng cao nhất hoặc hòa phiếu, không ai bị loại.{'\n'}
                • <Text style={{ fontWeight: 'bold', color: '#FCD34D' }}>Chủ phòng Skip Vote:</Text> Chủ phòng có nút ⏩ ở góc phải màn hình để bỏ qua nhanh giai đoạn biểu quyết khi cần thiết.
              </Text>
            </View>
          </ScrollView>

          {/* Footer nút Đã Hiểu */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: activeRole.teamColor }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmBtnText}>✅ Đã Hiểu Luật Chơi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 3, 15, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 540,
    maxHeight: Math.min(SCREEN_HEIGHT * 0.9, 700),
    backgroundColor: '#130E26',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.35)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(30, 20, 58, 0.6)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(18, 12, 36, 0.9)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 6,
  },
  tabEmoji: {
    fontSize: 16,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  bodyScroll: {
    flex: 1,
  },
  bodyScrollContent: {
    padding: 18,
    gap: 14,
  },
  roleHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(30, 22, 58, 0.7)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
  },
  roleAvatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  roleBigEmoji: {
    fontSize: 32,
  },
  roleHeroInfo: {
    flex: 1,
    gap: 6,
  },
  roleNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleTitleName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  teamBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  teamBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sloganBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sloganText: {
    color: '#FCD34D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sectionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  extraRuleBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderIcon: {
    fontSize: 16,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  sectionText: {
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipBullet: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(18, 12, 36, 0.9)',
  },
  confirmBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
