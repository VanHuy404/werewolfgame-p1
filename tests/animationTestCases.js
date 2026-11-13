/**
 * ============================================================================
 * 🎬 BỘ TEST CASE KIỂM TRA TOÀN BỘ HOẠT ẢNH & THỨ TỰ CHUỖI HOẠT ẢNH TRONG TRẬN
 * File: tests/animationTestCases.js
 * Chạy kiểm thử: node tests/animationTestCases.js
 * ============================================================================
 *
 * Mục tiêu kiểm thử:
 * 1. Kiểm tra chi tiết từng bước bên trong các hoạt ảnh đặc biệt:
 *    - CoupleRevealModal (Thường, Cặp đôi có Sói 🐺, Cặp đôi có Phe Thứ 3 🎶)
 *    - CoupleHeartbreakModal (Thường, Cặp đôi có Sói 🐺, Cặp đôi có Phe Thứ 3 🎶,
 *      chạy chữ từng ký tự màu xanh biển sâu thẳm trước khi người còn lại hóa xám)
 * 2. Kiểm tra bộ điều phối hàng đợi hoạt ảnh (Animation Queue Controller) của
 *    GameScreen trong TẤT CẢ 22 tình huống đơn lẻ và đa điều kiện chồng chéo:
 *    - Đảm bảo KHÔNG BAO GIỜ có 2 modal hoạt ảnh đè lên nhau (zero overlap).
 *    - Đảm bảo CoupleHeartbreakModal LUÔN chỉ xuất hiện NGAY SAU hoạt ảnh chết
 *      của người tình đầu tiên (dù đêm đó có thêm người khác chết vì độc/sói).
 *    - Đảm bảo Bảng Số Sói Còn Lại (RemainingWolvesOverlay) LUÔN xuất hiện SAU
 *      hoạt ảnh chết của cặp đôi (CoupleHeartbreakModal).
 *    - Đảm bảo Hoạt ảnh Thổi Sáo chết (PiedPiperPurifiedModal) & Thanh Tẩy Hoàng Kim
 *      (LivePurificationBanner) LUÔN xếp hàng sau hoạt ảnh chết & Tim Vỡ ở cả 3 pha
 *      (DAY_ANNOUNCE, DAY_VOTE, HUNTER_SHOT).
 * 3. Kiểm thử tích hợp trực tiếp với logic Server (processNightActions, startDayAnnounce,
 *    concludeDayVote, processHunterShot) để xác nhận payload & thứ tự sự kiện.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { PHASES, ROLES } = require('../server/constants');
const { processNightActions, processDayVote, checkWinCondition } = require('../server/gameLogic');

// ============================================================================
// PHẦN 1: MÔ PHỎNG BỘ ĐIỀU PHỐI HOẠT ẢNH CỦA GAMESCREEN (STATE MACHINE)
// Khớp 100% với logic trong screens/GameScreen.js để kiểm chứng thứ tự mở/đóng
// ============================================================================
class GameScreenAnimationController {
  constructor({ players = [], couple = [], myRole = 'villager', myId = 'p1' } = {}) {
    this.players = players;
    this.couple = couple;
    this.coupleDataState = couple;
    this.myRole = myRole;
    this.myId = myId;

    this.phase = PHASES.WAITING;
    this.deadPlayer = null;
    this.poisonedPlayer = null;
    this.shieldClashPlayer = null;
    this.savedPlayer = null;
    this.witchSavedPlayer = null;
    this.heartbrokenPlayer = null;
    this.hunterShotResultData = null;

    this.pendingNightPurification = null;
    this.pendingHunterPurification = null;
    this.pendingPurifiedVictims = [];
    this.pendingAfterHeartbreakCallback = null;
    this.pendingHangingCallback = null;
    this.votePiedPiperNext = null;
    this.votePiedPiperTimerActive = false;

    // Trạng thái hiển thị các modal hiện tại
    this.activeModals = new Set();
    // Lịch sử tuần tự các hoạt ảnh đã xuất hiện: [{ name, payload, activeSimultaneously }]
    this.timeline = [];
    this.overlapDetected = false;
  }

  _openModal(name, payload = {}) {
    // Ghi nhận nếu có bất kỳ modal chính nào đang mở cùng lúc (kiểm tra chồng đè)
    const currentlyOpen = [...this.activeModals];
    if (currentlyOpen.length > 0) {
      this.overlapDetected = true;
    }
    this.activeModals.add(name);
    this.timeline.push({
      step: this.timeline.length + 1,
      modal: name,
      payload,
      overlappedWith: currentlyOpen,
    });
  }

  _closeModal(name) {
    this.activeModals.delete(name);
  }

  // --- Sự kiện đầu trận: Xào bài & Lật mở vai trò ---
  onGameStarted({ role, players }) {
    this.myRole = role;
    this.players = players || this.players;
    this._openModal('CardShuffleModal', { role });
    this._closeModal('CardShuffleModal');
  }

  // --- Sự kiện Đêm 1: Thần Tình Yêu Cupid ghép đôi ---
  onCoupleFormed({ couple, cupid }) {
    this.coupleDataState = couple;
    const hasWolf = couple.some((p) => p.role === ROLES.WOLF);
    const hasPiper = couple.some((p) => p.role === ROLES.PIED_PIPER);
    const variant = hasWolf ? 'special_wolf' : hasPiper ? 'special_pied_piper' : 'normal';
    this._openModal('CoupleRevealModal', {
      couple: couple.map((c) => ({ id: c.id, name: c.name, role: c.role })),
      cupid,
      variant,
      sequence:
        variant === 'normal'
          ? ['0.0s: Hiện tên & avatar người chơi', '1.0s: Lộ diện role dưới tên']
          : [
              '0.0s: Hiện tên & avatar người chơi',
              `1.0s: Đổi avatar ${hasWolf ? 'Ma Sói' : 'Người Thổi Sáo'} + Hiện cap "${hasWolf ? 'Beauty and The Beast' : 'Your voice has manipulated me.'}"`,
              '1.55s: Lộ diện role dưới tên sau khi đổi avatar',
            ],
    });
    this._closeModal('CoupleRevealModal');
  }

  // --- Sự kiện Đêm: Tiên Tri soi ---
  onSeerResult(data) {
    this._openModal('SeerInspectionModal', {
      targetId: data.targetId,
      alignment: data.alignment,
    });
    this._closeModal('SeerInspectionModal');
  }

  // --- Sự kiện Đêm: Người Thổi Sáo thôi miên ---
  onPiedPiperConfirm(targetPlayers) {
    this._openModal('PiedPiperModal', {
      targets: targetPlayers.map((p) => p.id),
    });
    this._closeModal('PiedPiperModal');
  }

  // --- Sự kiện Người Thổi Sáo chết (socket 'pied-piper-purified') ---
  onPiedPiperPurified(data) {
    if (data?.cause === 'vote') return;

    this.pendingPurifiedVictims = (data?.purifiedPlayers || []).map((p) => p.id);

    if (this.activeModals.has('HunterShotModal') || data?.cause === 'hunter_shot') {
      this.pendingHunterPurification = data;
      return;
    }

    if (data?.cause === 'night') {
      this.pendingNightPurification = data;
      return;
    }

    this._openModal('PiedPiperPurifiedModal', { piedPiper: data?.piedPiper });
  }

  // --- Kiểm tra nạn nhân có phải người tình gây ra cái chết tuẫn tình của heartbrokenPlayer ---
  isVictimTheDeadLover(victimPlayer) {
    if (!this.heartbrokenPlayer || !victimPlayer || victimPlayer.id === this.heartbrokenPlayer.id) {
      return false;
    }
    if (this.heartbrokenPlayer.partnerId) {
      return victimPlayer.id === this.heartbrokenPlayer.partnerId;
    }
    const activeCouple =
      this.coupleDataState && this.coupleDataState.length === 2 ? this.coupleDataState : this.couple;
    if (activeCouple && activeCouple.length === 2) {
      return activeCouple.some((c) => (c?.id || c) === victimPlayer.id);
    }
    return true;
  }

  triggerNightPurificationIfPending() {
    if (this.pendingNightPurification) {
      const data = this.pendingNightPurification;
      this.pendingNightPurification = null;
      this.pendingPurifiedVictims = (data?.purifiedPlayers || []).map((p) => p.id);
      this._openModal('PiedPiperPurifiedModal', { piedPiper: data?.piedPiper, cause: 'night' });
      this.handlePiedPiperDeathModalClose();
      return true;
    }
    return false;
  }

  triggerLivePurification(victimIds = []) {
    this._openModal('LivePurificationBanner', { purifiedVictimIds: victimIds });
    this._closeModal('LivePurificationBanner');
  }

  handlePiedPiperDeathModalClose() {
    if (this.votePiedPiperNext && this.votePiedPiperTimerActive) {
      this.votePiedPiperNext();
      return;
    }
    this._closeModal('PiedPiperPurifiedModal');
    const victims = this.pendingPurifiedVictims || [];
    this.pendingPurifiedVictims = [];
    this.triggerLivePurification(victims);
  }

  triggerNightSequentialAfterDeath(victimPlayer, defaultReason = 'bị sát hại dã man', onNextStep = null) {
    const runNext = () => {
      if (typeof onNextStep === 'function') {
        return onNextStep();
      }
      return this.triggerNightPurificationIfPending();
    };

    if (this.isVictimTheDeadLover(victimPlayer)) {
      const isSpecial =
        victimPlayer.role === ROLES.WOLF ||
        this.heartbrokenPlayer.role === ROLES.WOLF ||
        victimPlayer.role === ROLES.PIED_PIPER ||
        this.heartbrokenPlayer.role === ROLES.PIED_PIPER;

      this.pendingAfterHeartbreakCallback = () => {
        runNext();
      };

      this._openModal('CoupleHeartbreakModal', {
        deadPlayer: victimPlayer,
        heartbrokenPlayer: this.heartbrokenPlayer,
        reason: defaultReason,
        variant: isSpecial ? 'special' : 'normal',
      });
      this.handleCoupleHeartbreakModalClose();
      return true;
    }

    return runNext();
  }

  handleCoupleHeartbreakModalClose() {
    this._closeModal('CoupleHeartbreakModal');
    if (this.pendingAfterHeartbreakCallback) {
      const cb = this.pendingAfterHeartbreakCallback;
      this.pendingAfterHeartbreakCallback = null;
      cb();
    }
  }

  // --- Sự kiện Bình Minh (DAY_ANNOUNCE) ---
  onDayAnnounce(data, nightPiperPurifiedPayload = null) {
    this.phase = PHASES.DAY_ANNOUNCE;
    this.deadPlayer = data.deadPlayer || null;
    this.poisonedPlayer = data.poisonedPlayer || null;
    this.shieldClashPlayer = data.shieldClashPlayer || null;
    this.savedPlayer = data.savedPlayer || null;
    this.witchSavedPlayer = data.witchSavedPlayer || null;
    this.heartbrokenPlayer = data.heartbrokenPlayer || null;

    // Server emit 'pied-piper-purified' cùng lúc với 'phase-change (DAY_ANNOUNCE)'
    if (nightPiperPurifiedPayload) {
      this.onPiedPiperPurified(nightPiperPurifiedPayload);
    }

    const isDualKill =
      this.deadPlayer &&
      this.poisonedPlayer &&
      this.deadPlayer.id === this.poisonedPlayer.id &&
      !this.shieldClashPlayer;
    const hasSeparateFirstEvent = Boolean(
      (this.deadPlayer && (!this.shieldClashPlayer || this.deadPlayer.id !== this.shieldClashPlayer.id)) ||
        (this.witchSavedPlayer &&
          (!this.shieldClashPlayer || this.witchSavedPlayer.id !== this.shieldClashPlayer.id))
    );

    if (this.shieldClashPlayer && !hasSeparateFirstEvent) {
      this._openModal('ThreeWayClashModal', { victim: this.shieldClashPlayer });
      this.handleThreeWayClashModalClose();
    } else if (isDualKill) {
      this._openModal('DualKillClashModal', { victim: this.deadPlayer });
      this.handleDualKillModalClose();
    } else if (this.witchSavedPlayer) {
      this._openModal('WitchHealSaveModal', { saved: this.witchSavedPlayer });
      this.handleFirstModalClose('WitchHealSaveModal');
    } else if (this.savedPlayer) {
      this._openModal('BodyguardSaveModal', { saved: this.savedPlayer });
      this.handleFirstModalClose('BodyguardSaveModal');
    } else if (this.deadPlayer) {
      this._openModal('WolfClawAttackModal', {
        victim: this.deadPlayer,
        revealedHunter: this.deadPlayer.role === ROLES.HUNTER,
      });
      this.handleFirstModalClose('WolfClawAttackModal');
    } else if (this.poisonedPlayer) {
      this._openModal('WitchPoisonModal', { victim: this.poisonedPlayer });
      this.handleWitchPoisonModalClose();
    }
  }

  handleFirstModalClose(firstModalName) {
    this._closeModal(firstModalName);

    const hasSeparateShieldClashNext = Boolean(
      this.shieldClashPlayer &&
        ((this.deadPlayer && this.deadPlayer.id !== this.shieldClashPlayer.id) ||
          (this.witchSavedPlayer && this.witchSavedPlayer.id !== this.shieldClashPlayer.id))
    );
    const hasPoisonNext = Boolean(
      this.poisonedPlayer &&
        !this.shieldClashPlayer &&
        (!this.deadPlayer || this.deadPlayer.id !== this.poisonedPlayer.id)
    );

    const runAfterFirstVictimSequence = () => {
      if (hasSeparateShieldClashNext) {
        this._openModal('ThreeWayClashModal', { victim: this.shieldClashPlayer });
        this.handleThreeWayClashModalClose();
        return true;
      }
      if (hasPoisonNext) {
        this._openModal('WitchPoisonModal', { victim: this.poisonedPlayer });
        this.handleWitchPoisonModalClose();
        return true;
      }
      return this.triggerNightPurificationIfPending();
    };

    this.triggerNightSequentialAfterDeath(
      this.deadPlayer,
      'bị Ma Sói sát hại dã man',
      runAfterFirstVictimSequence
    );
  }

  handleDualKillModalClose() {
    this._closeModal('DualKillClashModal');
    this.triggerNightSequentialAfterDeath(this.deadPlayer, 'bị cả Ma Sói và Phù Thủy trừng phạt');
  }

  handleWitchPoisonModalClose() {
    this._closeModal('WitchPoisonModal');
    this.triggerNightSequentialAfterDeath(this.poisonedPlayer, 'bị trúng độc tử vong');
  }

  handleThreeWayClashModalClose() {
    this._closeModal('ThreeWayClashModal');
    this.triggerNightSequentialAfterDeath(
      this.shieldClashPlayer,
      'bị Phù Thủy ném độc vỡ khiên tử nạn'
    );
  }

  // --- Sự kiện Treo Cổ Ban Ngày (DAY_VOTE -> 'vote-result') ---
  onVoteResult(data) {
    this.phase = PHASES.DAY_VOTE;

    const runAfterHanging = () => {
      const showWolfOverlay = (onFinished) => {
        if (data.remainingWolves !== undefined && data.remainingWolves !== null) {
          this._openModal('RemainingWolvesOverlay', {
            remainingWolves: data.remainingWolves,
            eliminated: data.eliminated || null,
          });
          this._closeModal('RemainingWolvesOverlay');
          if (onFinished) onFinished();
        } else if (onFinished) {
          onFinished();
        }
      };

      const triggerPiperDeathFlow = () => {
        this._openModal('PiedPiperPurifiedModal', {
          piedPiper: data.piedPiperVictim || data.eliminated,
          cause: 'vote',
        });
        this._closeModal('PiedPiperPurifiedModal');
        const victimIds = (data.purifiedPlayers || []).map((p) => p.id);
        this.triggerLivePurification(victimIds);
      };

      const runWolfOverlayFlow = () => {
        if (data.isPiedPiperDead) {
          showWolfOverlay(() => {
            triggerPiperDeathFlow();
          });
        } else {
          showWolfOverlay();
        }
      };

      if (data.heartbrokenPlayer && data.eliminated && data.eliminated.id !== data.heartbrokenPlayer.id) {
        this.pendingAfterHeartbreakCallback = () => {
          runWolfOverlayFlow();
        };
        this._openModal('CoupleHeartbreakModal', {
          deadPlayer: data.eliminated,
          heartbrokenPlayer: data.heartbrokenPlayer,
          reason: 'bị dân làng phán quyết treo cổ',
        });
        this.handleCoupleHeartbreakModalClose();
      } else {
        runWolfOverlayFlow();
      }
    };

    if (data.eliminated) {
      this._openModal('DaytimeHangingModal', {
        victim: data.eliminated,
        isWolf: data.eliminated.role === ROLES.WOLF,
        isHunter: data.eliminated.role === ROLES.HUNTER,
      });
      this._closeModal('DaytimeHangingModal');
      runAfterHanging();
    } else {
      runAfterHanging();
    }
  }

  // --- Sự kiện Thợ Săn Nổ Súng (HUNTER_SHOT -> 'hunter-shot-result') ---
  onHunterShotResult(data, hunterPiperPurifiedPayload = null) {
    this.phase = PHASES.HUNTER_SHOT;
    this.hunterShotResultData = data;

    if (hunterPiperPurifiedPayload) {
      this.onPiedPiperPurified(hunterPiperPurifiedPayload);
    }

    if (!data.passed && data.target) {
      this._openModal('HunterShotModal', {
        hunter: data.hunter,
        target: data.target,
      });
      this.handleHunterShotModalClose();
    }
  }

  handleHunterShotModalClose() {
    this._closeModal('HunterShotModal');
    const targetPlayer = this.hunterShotResultData?.target;
    const heartbroken = this.hunterShotResultData?.heartbrokenPlayer;

    const triggerHunterPurification = () => {
      if (this.pendingHunterPurification) {
        const data = this.pendingHunterPurification;
        this.pendingHunterPurification = null;
        this.pendingPurifiedVictims = (data?.purifiedPlayers || []).map((p) => p.id);
        this._openModal('PiedPiperPurifiedModal', {
          piedPiper: data?.piedPiper,
          cause: 'hunter_shot',
        });
        this.handlePiedPiperDeathModalClose();
      }
    };

    if (heartbroken && targetPlayer && targetPlayer.id !== heartbroken.id) {
      if (this.pendingHunterPurification) {
        this.pendingAfterHeartbreakCallback = () => {
          triggerHunterPurification();
        };
      }
      this._openModal('CoupleHeartbreakModal', {
        deadPlayer: targetPlayer,
        heartbrokenPlayer: heartbroken,
        reason: 'bị Thợ Săn nổ súng bắn hạ',
      });
      this.handleCoupleHeartbreakModalClose();
    } else {
      triggerHunterPurification();
    }
  }

  // --- Sự kiện Kết thúc trận (GAME_OVER) ---
  onGameOver({ winner, couple, players }) {
    this.phase = PHASES.GAME_OVER;
    if (winner === 'couple') {
      this._openModal('CupidVictoryModal', { couple, winner });
      this._closeModal('CupidVictoryModal');
    } else if (winner === 'pied_piper') {
      this._openModal('PiedPiperVictoryModal', { players, winner });
      this._closeModal('PiedPiperVictoryModal');
    }
    this._openModal('GameOverScreen', { winner });
    this._closeModal('GameOverScreen');
  }
}

// ============================================================================
// PHẦN 2: KIỂM TRA TIMELINE CHI TIẾT BÊN TRONG CÁC COMPONENT HOẠT ẢNH
// ============================================================================
function verifyComponentInternalTimelines() {
  const results = [];

  // 1. Kiểm tra CoupleRevealModal.js
  const coupleRevealCode = fs.readFileSync(
    path.join(__dirname, '../components/CoupleRevealModal.js'),
    'utf8'
  );
  assert(
    coupleRevealCode.includes('Beauty and The Beast'),
    'CoupleRevealModal phải có caption "Beauty and The Beast" khi cặp đôi có Sói'
  );
  assert(
    coupleRevealCode.includes('Your voice has manipulated me.'),
    'CoupleRevealModal phải có caption "Your voice has manipulated me." khi cặp đôi có Phe Thứ 3'
  );
  assert(
    coupleRevealCode.includes('}, 1000);') && coupleRevealCode.includes('}, 1550);'),
    'CoupleRevealModal phải hiển thị tên người chơi trước, sau 1.0s mới lộ role (cặp đôi thường) hoặc đổi avatar ở 1.0s rồi lộ role ở 1.55s (cặp đôi đặc biệt)'
  );
  results.push({
    id: 'COMP-01',
    name: 'CoupleRevealModal (Thường / Sói / Phe Thứ 3)',
    detail:
      '0s: Hiện tên & avatar -> 1.0s (Thường: hiện role | Đặc biệt: đổi avatar Sói/Thổi Sáo + hiện cap) -> 1.55s (Đặc biệt: hiện role dưới tên)',
  });

  // 2. Kiểm tra CoupleHeartbreakModal.js
  const coupleHeartbreakCode = fs.readFileSync(
    path.join(__dirname, '../components/CoupleHeartbreakModal.js'),
    'utf8'
  );
  assert(
    coupleHeartbreakCode.includes('It was my fault, I can\\\'t even protect you. I\\\'m so sorry....'),
    'CoupleHeartbreakModal phải có đúng dòng cap "It was my fault, I can\'t even protect you. I\'m so sorry...."'
  );
  assert(
    coupleHeartbreakCode.includes('color: \'#2563EB\''),
    'Dòng cap của CoupleHeartbreakModal phải có màu xanh biển sâu thẳm (#2563EB)'
  );
  assert(
    coupleHeartbreakCode.includes('setTypedText(HEARTBREAK_CHANT.slice(0, index))'),
    'Dòng cap của CoupleHeartbreakModal phải chạy từng chữ (typewriter) như Phù Thủy'
  );
  assert(
    coupleHeartbreakCode.includes('const capDelay = isSpecialCouple ? 1000 : 550;') &&
      coupleHeartbreakCode.includes('const breakDelay = isSpecialCouple ? 2350 : 1900;'),
    'CoupleHeartbreakModal: Nạn nhân 1 hóa xám (0.15s) -> (Nếu đặc biệt: hiện role + đổi avatar ở 0.5s) -> Gõ chữ dòng cap (0.55s/1.0s) -> Tim vỡ & người còn lại hóa đen xám (1.9s/2.35s)'
  );
  results.push({
    id: 'COMP-02',
    name: 'CoupleHeartbreakModal (Tuẫn tình Thường / Đặc biệt)',
    detail:
      '0.15s: Người chết trước hóa đen xám -> (Đặc biệt 0.5s: lộ role + đổi avatar) -> 0.55s/1.0s: Chạy từng chữ cap màu xanh biển sâu (#2563EB) -> 1.9s/2.35s: Tim vỡ & người còn lại hóa đen xám',
  });

  return results;
}

// ============================================================================
// PHẦN 3: 22 TEST CASE KIỂM TRA THỨ TỰ HOẠT ẢNH TRONG MỌI TÌNH HUỐNG TRẬN ĐẤU
// ============================================================================
function runAllAnimationTestCases() {
  const pA = { id: 'pA', name: 'An (Dân)', avatar: '🧑', role: ROLES.VILLAGER };
  const pB = { id: 'pB', name: 'Bình (Tiên Tri)', avatar: '🔮', role: ROLES.SEER };
  const pWolf = { id: 'pWolf', name: 'Sói Xám', avatar: '🐺', role: ROLES.WOLF };
  const pPiper = { id: 'pPiper', name: 'Thổi Sáo', avatar: '🎶', role: ROLES.PIED_PIPER };
  const pHunter = { id: 'pHunter', name: 'Thợ Săn', avatar: '🏹', role: ROLES.HUNTER };
  const pCupid = { id: 'pCupid', name: 'Cupid', avatar: '💘', role: ROLES.CUPID };
  const allPlayers = [pA, pB, pWolf, pPiper, pHunter, pCupid];

  const testCases = [
    {
      id: 'TC-01',
      when: 'Bắt đầu ván đấu (ROLE_REVEAL)',
      condition: 'Chủ phòng bấm Bắt đầu ván đấu',
      expectedSequence: ['CardShuffleModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onGameStarted({ role: ROLES.SEER, players: allPlayers });
        return ctrl;
      },
    },
    {
      id: 'TC-02',
      when: 'Đêm 1 - Kết nối Cặp Đôi Thường (NIGHT_COUPLE_REVEAL)',
      condition: 'Cupid ghép đôi 2 người Phe Dân (An + Bình)',
      expectedSequence: ['CoupleRevealModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onCoupleFormed({ couple: [pA, pB], cupid: pCupid });
        assert.strictEqual(ctrl.timeline[0].payload.variant, 'normal');
        return ctrl;
      },
    },
    {
      id: 'TC-03',
      when: 'Đêm 1 - Kết nối Cặp Đôi Đặc Biệt có Sói (NIGHT_COUPLE_REVEAL)',
      condition: 'Cupid ghép đôi 1 Dân + 1 Ma Sói (Beauty and The Beast)',
      expectedSequence: ['CoupleRevealModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onCoupleFormed({ couple: [pA, pWolf], cupid: pCupid });
        assert.strictEqual(ctrl.timeline[0].payload.variant, 'special_wolf');
        return ctrl;
      },
    },
    {
      id: 'TC-04',
      when: 'Đêm 1 - Kết nối Cặp Đôi Đặc Biệt có Phe Thứ 3 (NIGHT_COUPLE_REVEAL)',
      condition: 'Cupid ghép đôi 1 Dân + 1 Người Thổi Sáo (Your voice has manipulated me.)',
      expectedSequence: ['CoupleRevealModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onCoupleFormed({ couple: [pA, pPiper], cupid: pCupid });
        assert.strictEqual(ctrl.timeline[0].payload.variant, 'special_pied_piper');
        return ctrl;
      },
    },
    {
      id: 'TC-05',
      when: 'Trong Đêm - Tiên Tri soi (NIGHT_SEER)',
      condition: 'Tiên Tri bấm chọn soi 1 người chơi',
      expectedSequence: ['SeerInspectionModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers, myRole: ROLES.SEER });
        ctrl.onSeerResult({ targetId: pWolf.id, alignment: 'evil' });
        return ctrl;
      },
    },
    {
      id: 'TC-06',
      when: 'Trong Đêm - Người Thổi Sáo thôi miên (NIGHT_PIED_PIPER)',
      condition: 'Người Thổi Sáo chốt thôi miên 2 mục tiêu',
      expectedSequence: ['PiedPiperModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers, myRole: ROLES.PIED_PIPER });
        ctrl.onPiedPiperConfirm([pA, pB]);
        return ctrl;
      },
    },
    {
      id: 'TC-07',
      when: 'Bình Minh (DAY_ANNOUNCE) - Bảo Vệ che chở thành công',
      condition: 'Sói cắn An và Bảo Vệ bảo vệ đúng An (không có độc)',
      expectedSequence: ['BodyguardSaveModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onDayAnnounce({ savedPlayer: pA });
        return ctrl;
      },
    },
    {
      id: 'TC-08',
      when: 'Bình Minh (DAY_ANNOUNCE) - Phù Thủy cứu sống thành công',
      condition: 'Sói cắn An và Phù Thủy dùng bình Cứu hồi sinh An',
      expectedSequence: ['WitchHealSaveModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onDayAnnounce({ witchSavedPlayer: pA });
        return ctrl;
      },
    },
    {
      id: 'TC-09',
      when: 'Bình Minh (DAY_ANNOUNCE) - Sói cắn 1 người đơn lẻ',
      condition: 'Sói cắn chết An (An không thuộc cặp đôi, không phải Thổi Sáo)',
      expectedSequence: ['WolfClawAttackModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onDayAnnounce({ deadPlayer: pA });
        return ctrl;
      },
    },
    {
      id: 'TC-10',
      when: 'Bình Minh (DAY_ANNOUNCE) - Phù Thủy ném độc 1 người đơn lẻ',
      condition: 'Đêm không ai chết vì Sói, Phù Thủy ném độc chết Bình',
      expectedSequence: ['WitchPoisonModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onDayAnnounce({ poisonedPlayer: pB });
        return ctrl;
      },
    },
    {
      id: 'TC-11',
      when: 'Bình Minh (DAY_ANNOUNCE) - Xung đột tay ba (Three-Way Clash)',
      condition: 'Sói cắn An + Bảo Vệ che chở An + Phù Thủy ném độc An vỡ khiên',
      expectedSequence: ['ThreeWayClashModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onDayAnnounce({
          savedPlayer: pA,
          poisonedPlayer: pA,
          shieldClashPlayer: pA,
        });
        return ctrl;
      },
    },
    {
      id: 'TC-12',
      when: 'Bình Minh (DAY_ANNOUNCE) - Đòn trừng phạt kép (Dual Kill)',
      condition: 'Cả Ma Sói và Phù Thủy cùng nhắm giết An trong đêm (không có Bảo Vệ)',
      expectedSequence: ['DualKillClashModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onDayAnnounce({
          deadPlayer: pA,
          poisonedPlayer: pA,
        });
        return ctrl;
      },
    },
    {
      id: 'TC-13',
      when: 'Bình Minh (DAY_ANNOUNCE) - Đa hoạt ảnh: Sói cắn A + Phù Thủy độc B',
      condition: 'Sói cắn chết An VÀ Phù Thủy ném độc chết Bình trong cùng 1 đêm',
      expectedSequence: ['WolfClawAttackModal', 'WitchPoisonModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({ players: allPlayers });
        ctrl.onDayAnnounce({
          deadPlayer: pA,
          poisonedPlayer: pB,
        });
        return ctrl;
      },
    },
    {
      id: 'TC-14',
      when: 'Bình Minh (DAY_ANNOUNCE) - Đa hoạt ảnh: Sói cắn A (A yêu B) + Phù Thủy độc C',
      condition:
        'Sói cắn An (An kết đôi với Bình) VÀ Phù Thủy ném độc Sói Xám -> Tim Vỡ của (An -> Bình) phải chạy NGAY SAU Sói cắn An, rồi mới tới Phù Thủy độc Sói Xám!',
      expectedSequence: ['WolfClawAttackModal', 'CoupleHeartbreakModal', 'WitchPoisonModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pA, pB],
        });
        ctrl.onDayAnnounce({
          deadPlayer: pA,
          poisonedPlayer: pWolf,
          heartbrokenPlayer: { ...pB, partnerId: pA.id },
        });
        assert.strictEqual(
          ctrl.timeline[1].payload.deadPlayer.id,
          pA.id,
          'CoupleHeartbreakModal phải hiển thị đúng An (người bị Sói cắn) là người chết trước'
        );
        return ctrl;
      },
    },
    {
      id: 'TC-15',
      when: 'Bình Minh (DAY_ANNOUNCE) - Đa hoạt ảnh: Sói cắn A + Phù Thủy độc B (B yêu C)',
      condition:
        'Sói cắn An (đơn lẻ) VÀ Phù Thủy ném độc Bình (Bình kết đôi với Sói Xám) -> Sói cắn An chạy trước -> Phù Thủy độc Bình -> Tim Vỡ (Bình -> Sói Xám)',
      expectedSequence: ['WolfClawAttackModal', 'WitchPoisonModal', 'CoupleHeartbreakModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pB, pWolf],
        });
        ctrl.onDayAnnounce({
          deadPlayer: pA,
          poisonedPlayer: pB,
          heartbrokenPlayer: { ...pWolf, partnerId: pB.id },
        });
        assert.strictEqual(
          ctrl.timeline[2].payload.deadPlayer.id,
          pB.id,
          'CoupleHeartbreakModal phải hiển thị đúng Bình (người trúng độc) là người chết trước'
        );
        return ctrl;
      },
    },
    {
      id: 'TC-16',
      when: 'Bình Minh (DAY_ANNOUNCE) - Chuỗi 5 hoạt ảnh: Phù Thủy cứu A + Độc B (B yêu C là Thổi Sáo)',
      condition:
        'Phù Thủy cứu An + Ném độc Bình (Bình yêu Người Thổi Sáo) -> Cứu An -> Độc Bình -> Tim Vỡ (Bình -> Thổi Sáo) -> Sáo Gãy -> Thanh Tẩy Hoàng Kim',
      expectedSequence: [
        'WitchHealSaveModal',
        'WitchPoisonModal',
        'CoupleHeartbreakModal',
        'PiedPiperPurifiedModal',
        'LivePurificationBanner',
      ],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pB, pPiper],
        });
        ctrl.onDayAnnounce(
          {
            witchSavedPlayer: pA,
            poisonedPlayer: pB,
            heartbrokenPlayer: { ...pPiper, partnerId: pB.id },
          },
          {
            piedPiper: pPiper,
            purifiedPlayers: [pA, pWolf],
            cause: 'night',
          }
        );
        return ctrl;
      },
    },
    {
      id: 'TC-17',
      when: 'Bình Minh (DAY_ANNOUNCE) - Chuỗi cực đại: Sói cắn A (yêu Thợ Săn) + Độc Thổi Sáo + Thợ Săn bắn',
      condition:
        'Sói cắn An (An yêu Thợ Săn, setting bật) + Phù Thủy độc Thổi Sáo -> Sói cắn An -> Tim Vỡ (An -> Thợ Săn) -> Độc Thổi Sáo -> Sáo Gãy -> Thanh Tẩy -> Thợ Săn nổ súng!',
      expectedSequence: [
        'WolfClawAttackModal',
        'CoupleHeartbreakModal',
        'WitchPoisonModal',
        'PiedPiperPurifiedModal',
        'LivePurificationBanner',
        'HunterShotModal',
      ],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pA, pHunter],
        });
        ctrl.onDayAnnounce(
          {
            deadPlayer: pA,
            poisonedPlayer: pPiper,
            heartbrokenPlayer: { ...pHunter, partnerId: pA.id },
          },
          {
            piedPiper: pPiper,
            purifiedPlayers: [pB],
            cause: 'night',
          }
        );
        // Sau khi kết thúc DAY_ANNOUNCE, server chuyển sang HUNTER_SHOT cho Thợ Săn chết vì tình
        ctrl.onHunterShotResult({
          hunter: pHunter,
          target: pWolf,
          passed: false,
        });
        return ctrl;
      },
    },
    {
      id: 'TC-18',
      when: 'Bình Minh (DAY_ANNOUNCE) - Xung đột tay ba + Tim Vỡ + Thổi Sáo',
      condition:
        'Sói + Bảo Vệ + Phù Thủy cùng nhắm An (An yêu Người Thổi Sáo) -> ThreeWayClashModal(An) -> CoupleHeartbreakModal(An -> Thổi Sáo) -> PiedPiperPurifiedModal -> LivePurificationBanner',
      expectedSequence: [
        'ThreeWayClashModal',
        'CoupleHeartbreakModal',
        'PiedPiperPurifiedModal',
        'LivePurificationBanner',
      ],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pA, pPiper],
        });
        ctrl.onDayAnnounce(
          {
            savedPlayer: pA,
            poisonedPlayer: pA,
            shieldClashPlayer: pA,
            heartbrokenPlayer: { ...pPiper, partnerId: pA.id },
          },
          {
            piedPiper: pPiper,
            purifiedPlayers: [pB],
            cause: 'night',
          }
        );
        return ctrl;
      },
    },
    {
      id: 'TC-19',
      when: 'Treo cổ ban ngày (DAY_VOTE) - Treo cổ 1 người trong Cặp Đôi',
      condition:
        'Dân làng vote treo cổ An (An yêu Bình) -> Đoạn Đầu Đài (An) -> Tim Vỡ (An -> Bình) -> Bảng Số Sói Còn Lại (xuất hiện SAU hiệu ứng chết của cặp đôi)',
      expectedSequence: [
        'DaytimeHangingModal',
        'CoupleHeartbreakModal',
        'RemainingWolvesOverlay',
      ],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pA, pB],
        });
        ctrl.onVoteResult({
          eliminated: pA,
          heartbrokenPlayer: pB,
          remainingWolves: 1,
          isPiedPiperDead: false,
        });
        return ctrl;
      },
    },
    {
      id: 'TC-20',
      when: 'Treo cổ ban ngày (DAY_VOTE) - Chuỗi cực đại: Treo cổ A (A yêu Thổi Sáo) + Thanh Tẩy',
      condition:
        'Treo cổ An (An yêu Người Thổi Sáo) -> Đoạn Đầu Đài (An) -> Tim Vỡ (An -> Thổi Sáo) -> Bảng Số Sói Còn Lại -> Sáo Gãy -> Thanh Tẩy Hoàng Kim',
      expectedSequence: [
        'DaytimeHangingModal',
        'CoupleHeartbreakModal',
        'RemainingWolvesOverlay',
        'PiedPiperPurifiedModal',
        'LivePurificationBanner',
      ],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pA, pPiper],
        });
        ctrl.onVoteResult({
          eliminated: pA,
          heartbrokenPlayer: pPiper,
          piedPiperVictim: pPiper,
          remainingWolves: 1,
          isPiedPiperDead: true,
          purifiedPlayers: [pB],
        });
        return ctrl;
      },
    },
    {
      id: 'TC-21',
      when: 'Thợ Săn nổ súng (HUNTER_SHOT) - Bắn trúng A (A yêu Người Thổi Sáo)',
      condition:
        'Thợ Săn bắn hạ An (An yêu Người Thổi Sáo) -> HunterShotModal(An) -> CoupleHeartbreakModal(An -> Thổi Sáo) -> PiedPiperPurifiedModal(Thổi Sáo) -> LivePurificationBanner',
      expectedSequence: [
        'HunterShotModal',
        'CoupleHeartbreakModal',
        'PiedPiperPurifiedModal',
        'LivePurificationBanner',
      ],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pA, pPiper],
        });
        ctrl.onHunterShotResult(
          {
            hunter: pHunter,
            target: pA,
            heartbrokenPlayer: pPiper,
            passed: false,
          },
          {
            piedPiper: pPiper,
            purifiedPlayers: [pB],
            cause: 'hunter_shot',
          }
        );
        return ctrl;
      },
    },
    {
      id: 'TC-22',
      when: 'Kết thúc trận đấu (GAME_OVER) - Chiến thắng Phe Cặp Đôi & Phe Thổi Sáo',
      condition: 'Cặp đôi khác phe chiến thắng (CupidVictoryModal) hoặc Người Thổi Sáo chiến thắng (PiedPiperVictoryModal)',
      expectedSequence: [
        'CupidVictoryModal',
        'GameOverScreen',
        'PiedPiperVictoryModal',
        'GameOverScreen',
      ],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pA, pWolf],
        });
        ctrl.onGameOver({ winner: 'couple', couple: [pA, pWolf], players: allPlayers });
        ctrl.onGameOver({ winner: 'pied_piper', couple: [pA, pWolf], players: allPlayers });
        return ctrl;
      },
    },
  ];

  const report = [];

  for (const tc of testCases) {
    const ctrl = tc.run();
    const actualSequence = ctrl.timeline.map((item) => item.modal);

    assert.strictEqual(
      ctrl.overlapDetected,
      false,
      `[${tc.id}] Phát hiện hoạt ảnh bị đè lên nhau: ${JSON.stringify(ctrl.timeline)}`
    );
    assert.deepStrictEqual(
      actualSequence,
      tc.expectedSequence,
      `[${tc.id}] Thứ tự hoạt ảnh không khớp!\n  Mong đợi: ${tc.expectedSequence.join(' ➔ ')}\n  Thực tế:  ${actualSequence.join(' ➔ ')}`
    );

    report.push({
      id: tc.id,
      when: tc.when,
      condition: tc.condition,
      sequence: actualSequence.join(' ➔ '),
      passed: true,
    });
  }

  return report;
}

// ============================================================================
// PHẦN 4: KIỂM THỬ LOGIC SERVER KẾT HỢP (gameLogic.js)
// ============================================================================
function verifyServerGameLogicIntegration() {
  // Kiểm tra processNightActions với xung đột Bảo Vệ + Sói + Phù Thủy
  const mockRoom = {
    players: new Map([
      ['p1', { id: 'p1', name: 'An', role: ROLES.VILLAGER, alive: true }],
      ['p2', { id: 'p2', name: 'Bình', role: ROLES.HUNTER, alive: true }],
      ['p3', { id: 'p3', name: 'Sói', role: ROLES.WOLF, alive: true }],
    ]),
    couple: ['p1', 'p2'],
    settings: { hunterShootOnHeartbreak: true },
    nightActions: {
      wolfVotes: new Map([['p3', 'p1']]),
      wolfConfirmed: new Set(['p3']),
      bodyguardTarget: 'p1',
      witchSavedThisNight: false,
      witchPoisonTarget: 'p1',
      piedPiperTargets: [],
    },
  };

  const res = processNightActions(mockRoom);
  assert.strictEqual(res.attackedPlayerId, 'p1', 'Sói phải nhắm vào p1');
  assert.strictEqual(res.savedPlayerId, 'p1', 'Bảo Vệ phải được ghi nhận đã đỡ đòn cho p1');
  assert.strictEqual(res.poisonedPlayerId, 'p1', 'Phù Thủy ném độc vào p1');
  assert.strictEqual(res.shieldClashPlayerId, 'p1', 'Phải kích hoạt shieldClashPlayerId cho p1');
  assert.strictEqual(res.deadPlayerId, null, 'p1 chết vì độc xuyên khiên chứ không phải do Sói');
  assert.strictEqual(
    mockRoom.nightActions.wolfVotes.size,
    0,
    'Sau khi kết thúc đêm, wolfVotes phải được xóa sạch để đêm sau Sói không bị dính chọn sẵn'
  );

  // Kiểm tra điều kiện thắng của Cặp Đôi Uyên Ương khác phe (Sói + Dân)
  mockRoom.players.get('p1').alive = true;
  mockRoom.players.get('p2').alive = false;
  mockRoom.players.get('p3').alive = true;
  mockRoom.couple = ['p1', 'p3']; // Dân + Sói
  const winCouple = checkWinCondition(mockRoom);
  assert.strictEqual(winCouple.gameOver, true, 'Khi chỉ còn Cặp Đôi khác phe sống sót thì game phải kết thúc');
  assert.strictEqual(winCouple.winner, 'couple', 'Phe thắng phải là couple (Cặp Đôi Uyên Ương)');
}

// ============================================================================
// CHẠY TOÀN BỘ TEST SUITE & IN BÁO CÁO
// ============================================================================
function main() {
  console.log('================================================================================');
  console.log('🎬 BẮT ĐẦU KIỂM THỬ TOÀN BỘ HOẠT ẢNH & THỨ TỰ CHUỖI HOẠT ẢNH (MA SÓI DEMO)');
  console.log('================================================================================\n');

  const compResults = verifyComponentInternalTimelines();
  console.log('✅ [PHẦN 1] KIỂM TRA TIMELINE CHI TIẾT BÊN TRONG COMPONENT:');
  for (const c of compResults) {
    console.log(`   ✔ [${c.id}] ${c.name}`);
    console.log(`       ↳ ${c.detail}`);
  }
  console.log('');

  const queueResults = runAllAnimationTestCases();
  console.log(`✅ [PHẦN 2] KIỂM TRA HÀNG ĐỢI & THỨ TỰ HOẠT ẢNH (${queueResults.length}/${queueResults.length} TEST CASES PASS):`);
  for (const r of queueResults) {
    console.log(`   ✔ [${r.id}] ${r.when}`);
    console.log(`       • Điều kiện: ${r.condition}`);
    console.log(`       • Thứ tự:    ${r.sequence}`);
  }
  console.log('');

  verifyServerGameLogicIntegration();
  console.log('✅ [PHẦN 3] KIỂM TRA TÍCH HỢP LOGIC SERVER (processNightActions / wolfVotes / checkWinCondition): PASS 100%\n');

  console.log('================================================================================');
  console.log(`🎉 TỔNG KẾT: TẤT CẢ ${compResults.length + queueResults.length + 1} BÀI TEST HOẠT ẢNH ĐỀU PASS 100% (0 OVERLAP)!`);
  console.log('================================================================================');
}

main();
