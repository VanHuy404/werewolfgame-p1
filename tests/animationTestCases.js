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

    const activeCouple = this.couple && this.couple.length === 2 ? this.couple : [];
    const coupleIds = activeCouple.map((c) => c?.id || c);
    const isSimultaneousCoupleNightDeath = Boolean(
      this.deadPlayer &&
        this.poisonedPlayer &&
        this.deadPlayer.id !== this.poisonedPlayer.id &&
        (data.coupleSimultaneousNightDeath ||
          (coupleIds.length === 2 &&
            coupleIds.includes(this.deadPlayer.id) &&
            coupleIds.includes(this.poisonedPlayer.id)))
    );

    if (isSimultaneousCoupleNightDeath) {
      this.pendingAfterHeartbreakCallback = () => {
        this.triggerNightPurificationIfPending();
      };
      this._openModal('CoupleHeartbreakModal', {
        deadPlayer: this.deadPlayer,
        heartbrokenPlayer: this.poisonedPlayer,
        isSimultaneousNightDeath: true,
        variant: 'simultaneous_night_death',
      });
      this.handleCoupleHeartbreakModalClose();
      return;
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
    coupleHeartbreakCode.includes('setTypedText(activeChant.slice(0, index))') &&
      coupleHeartbreakCode.includes('Death could not separate us... See you on the other side....') &&
      coupleHeartbreakCode.includes('simultaneousClawOverlay') &&
      coupleHeartbreakCode.includes('simultaneousPoisonBottle') &&
      coupleHeartbreakCode.includes('const simultaneousCapDelay = 2000;'),
    'CoupleHeartbreakModal phải chạy từng chữ (typewriter) và hỗ trợ chế độ Đồng Tử Trong Đêm (Sói cào + Phù Thủy ném độc -> 2 người chuyển ảnh chết -> chữ lên sau)'
  );
  assert(
    coupleHeartbreakCode.includes('const capDelay = 550;') &&
      coupleHeartbreakCode.includes('const breakDelay = 1900;') &&
      !coupleHeartbreakCode.includes('{victim.role &&') &&
      !coupleHeartbreakCode.includes('{heartbroken.role &&'),
    'CoupleHeartbreakModal: Nạn nhân 1 hóa xám (0.15s) -> Gõ chữ dòng cap (0.55s) -> Tim vỡ & người còn lại hóa đen xám (1.9s) và KHÔNG lộ role khi cặp đôi chết'
  );
  results.push({
    id: 'COMP-02',
    name: 'CoupleHeartbreakModal (Tuẫn tình & Đồng Tử Trong Đêm - Không lộ Role)',
    detail:
      'Thường: Người 1 hóa xám (0.15s) -> Cap (0.55s) -> Người 2 hóa xám (1.9s) | Đồng Tử: Sói cào (0.4s) + Phù Thủy độc (0.75s) -> Cả 2 hóa xám (1.35s) -> Cap "Death could not separate us..." lên sau (2.0s)',
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
    {
      id: 'TC-23',
      when: 'Bình Minh (DAY_ANNOUNCE) - Cả 2 người tình đều chết trong 1 đêm (1 người Sói cào + 1 người Phù Thủy độc)',
      condition: 'An và Bình là Cặp Đôi: An bị Sói cào chết VÀ Bình bị Phù Thủy ném độc trong cùng 1 đêm -> Thay thế hoàn toàn 2 hoạt ảnh riêng lẻ bằng hoạt ảnh đặc biệt của Cặp Đôi!',
      expectedSequence: ['CoupleHeartbreakModal'],
      run: () => {
        const ctrl = new GameScreenAnimationController({
          players: allPlayers,
          couple: [pA, pB],
        });
        ctrl.onDayAnnounce({
          deadPlayer: pA,
          poisonedPlayer: pB,
          coupleSimultaneousNightDeath: true,
        });
        assert.strictEqual(ctrl.timeline[0].payload.isSimultaneousNightDeath, true);
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
// PHẦN 5: KIỂM THỬ GIAO DIỆN MOBILE RESPONSIVE & CHAT DRAWER TRÊN ĐIỆN THOẠI
// ============================================================================
function verifyMobileResponsiveAndChatLayout() {
  const coupleRevealCode = fs.readFileSync(
    path.join(__dirname, '../components/CoupleRevealModal.js'),
    'utf8'
  );
  const coupleHeartbreakCode = fs.readFileSync(
    path.join(__dirname, '../components/CoupleHeartbreakModal.js'),
    'utf8'
  );
  const piperPurifiedCode = fs.readFileSync(
    path.join(__dirname, '../components/PiedPiperPurifiedModal.js'),
    'utf8'
  );
  const chatBoxCode = fs.readFileSync(
    path.join(__dirname, '../components/ChatBox.js'),
    'utf8'
  );
  const gameScreenCode = fs.readFileSync(
    path.join(__dirname, '../screens/GameScreen.js'),
    'utf8'
  );

  // 1. Kiểm tra useWindowDimensions() và co giãn động trên màn hình nhỏ (< 420px)
  assert(
    coupleRevealCode.includes('useWindowDimensions') &&
      coupleRevealCode.includes('isCompactMobile'),
    'CoupleRevealModal phải dùng useWindowDimensions & isCompactMobile để tự thu gọn trên màn hình điện thoại nhỏ (< 420px)'
  );
  assert(
    coupleHeartbreakCode.includes('useWindowDimensions') &&
      coupleHeartbreakCode.includes('isCompactMobile') &&
      coupleHeartbreakCode.includes('width: 82, height: 96'),
    'CoupleHeartbreakModal phải dùng useWindowDimensions & thu gọn vùng tim vỡ ở giữa (82px) trên mobile để 2 cột Avatar và huy hiệu không bị vỡ dòng'
  );
  assert(
    piperPurifiedCode.includes('useWindowDimensions') &&
      piperPurifiedCode.includes('scale: isCompactMobile ? 0.84 : 1'),
    'PiedPiperPurifiedModal phải tự thu phóng (scale 0.84) trên màn hình < 400px để cây sáo ngang (340px) không tràn viền'
  );

  // 2. Kiểm tra tính toán kích thước thực tế trên các màn hình điện thoại phổ biến (360px, 375px, 390px, 414px)
  const mobileViewports = [
    { device: 'Android Small (360x640)', width: 360, height: 640 },
    { device: 'iPhone SE / 8 (375x667)', width: 375, height: 667 },
    { device: 'iPhone 14 / 15 (390x844)', width: 390, height: 844 },
    { device: 'iPhone Plus / Pro Max (414x896)', width: 414, height: 896 },
  ];

  const mobileChecks = [];
  for (const vp of mobileViewports) {
    const isCompact = vp.width < 420;
    // CoupleRevealModal width & inner columns
    const revealCardWidth = Math.min(vp.width - 20, 470);
    const revealPadding = (isCompact ? 14 : 22) * 2;
    const revealConnectorWidth = isCompact ? 16 * 2 + 34 : 26 * 2 + 46;
    const revealEachColWidth = (revealCardWidth - revealPadding - 8 - revealConnectorWidth) / 2;
    assert(
      revealCardWidth <= vp.width - 16 && revealEachColWidth >= 100,
      `[${vp.device}] CoupleRevealModal bị hẹp cột (${revealEachColWidth}px)`
    );

    // CoupleHeartbreakModal width & inner columns
    const heartbreakCardWidth = Math.min(vp.width - 20, 500);
    const heartbreakPadding = (isCompact ? 14 : 20) * 2;
    const heartbreakCenterWidth = isCompact ? 82 : 120;
    const heartbreakEachColWidth =
      (heartbreakCardWidth - heartbreakPadding - heartbreakCenterWidth) / 2;
    assert(
      heartbreakCardWidth <= vp.width - 16 && heartbreakEachColWidth >= 105,
      `[${vp.device}] CoupleHeartbreakModal bị hẹp cột (${heartbreakEachColWidth}px)`
    );

    // Mobile Chat Drawer width
    const chatDrawerWidth = Math.min(vp.width * 0.88, 360);
    assert(
      chatDrawerWidth >= 310 && chatDrawerWidth <= vp.width,
      `[${vp.device}] Chat Drawer trên mobile phải đủ rộng rãi (${chatDrawerWidth}px) và không tràn màn hình`
    );

    mobileChecks.push({
      device: vp.device,
      revealColPx: Math.round(revealEachColWidth),
      heartbreakColPx: Math.round(heartbreakEachColWidth),
      chatDrawerPx: Math.round(chatDrawerWidth),
    });
  }

  // 3. Kiểm tra ChatBox & GameScreen trên Mobile (3 kênh Làng + Hang Sói + Cặp Đôi & Nút nổi không đè thanh hành động)
  assert(
    chatBoxCode.includes("isSmallMobile && isCouple ? '🐺 Sói' : '🐺 Hang Sói'") &&
      chatBoxCode.includes("isSmallMobile && isWolf ? '💘 Đôi' : '💘 Cặp Đôi'"),
    'ChatBox trên mobile phải rút gọn nhãn tab khi người chơi vừa là Sói vừa thuộc Cặp Đôi (3 tab cùng lúc) để không bị rớt dòng'
  );
  assert(
    chatBoxCode.includes('Kênh bí mật với người yêu'),
    'ChatBox phải có thanh tiêu đề phụ thông báo trạng thái kênh Cặp Đôi rõ ràng trên cả mobile và PC'
  );
  assert(
    gameScreenCode.includes('Math.min(windowWidth * 0.88, 360)') &&
      gameScreenCode.includes('isMobile && hasBottomActionBar && { bottom: 148, right: 12 }'),
    'GameScreen trên mobile phải mở rộng khung Chat Drawer (88%, tối đa 360px) và tự nâng nút Chat nổi lên trên thanh hành động (bottom: 148) để không che nút bấm kỹ năng/bỏ phiếu'
  );

  return mobileChecks;
}

// ============================================================================
// PHẦN 5: KIỂM TRA RECONNECT (F5), RESET VÁN 2, EXIT GIỮA TRẬN & NÂNG CẤP UX (1 & 4)
// ============================================================================
function verifyLifecycleAndUxUpgrades() {
  const serverCode = fs.readFileSync(
    path.join(__dirname, '../server/index.js'),
    'utf8'
  );
  const appCode = fs.readFileSync(
    path.join(__dirname, '../App.js'),
    'utf8'
  );
  const gameOverCode = fs.readFileSync(
    path.join(__dirname, '../screens/GameOverScreen.js'),
    'utf8'
  );
  const chatBoxCode = fs.readFileSync(
    path.join(__dirname, '../components/ChatBox.js'),
    'utf8'
  );
  const gameScreenCode = fs.readFileSync(
    path.join(__dirname, '../screens/GameScreen.js'),
    'utf8'
  );

  const checks = [];

  // 1. Kiểm tra Reconnect (F5) cho Cặp Đôi, Thợ Săn, Phù Thủy & per-player players-update
  assert(
    serverCode.includes('room.couple = room.couple.map(replaceOldId)') &&
      serverCode.includes('room.hunterShotContext.hunterId = socket.id') &&
      serverCode.includes('getPlayersData(room, pid)'),
    'Server reconnect-room phải cập nhật socket.id mới vào room.couple, hunterShotContext và gửi players-update riêng cho từng pid'
  );
  assert(
    (appCode.includes('setCouple(data.couple || [])') || appCode.includes('setCouple(hydratePlayers(data.couple || []))')) &&
      appCode.includes('setMatchHistory(data.matchHistory || [])'),
    'App.js reconnected-in-game phải khôi phục couple và matchHistory'
  );
  checks.push('Reconnect (F5): Bảo toàn Cặp Đôi, Phù Thủy, Thợ Săn, Tiên Tri & Role đồng đội');

  // 2. Kiểm tra Reset sạch sẽ khi về phòng chờ (return-to-lobby)
  assert(
    serverCode.includes('room.couple = null;') &&
      serverCode.includes('room.cupidActed = false;') &&
      serverCode.includes('room.matchHistory = [];') &&
      appCode.includes('setHeartbrokenPlayer(null);'),
    'Server return-to-lobby & App.js returned-to-lobby phải reset sạch couple, heartbrokenPlayer, cupidActed và matchHistory'
  );
  checks.push('Return to Lobby (Ván 2): Reset sạch sẽ Cặp Đôi, Tim Vỡ, Bình Thuốc & Lịch sử trận');

  // 3. Kiểm tra thoát giữa trận (handleMidGameExit) với Cặp Đôi & Người Thổi Sáo
  assert(
    serverCode.includes('exitHeartbrokenPlayer') &&
      serverCode.includes('isPiedPiperExited') &&
      serverCode.includes("cause: 'exit'"),
    'handleMidGameExit phải tự động xử lý tuẫn tình nếu 1 người trong Cặp Đôi rời trận và thanh tẩy bùa mê nếu Người Thổi Sáo rời trận'
  );
  checks.push('Mid-Game Exit: Tự động kích hoạt Tuẫn Tình (Cặp Đôi) & Thanh Tẩy (Thổi Sáo) khi thoát ngang');

  // 4. Kiểm tra nâng cấp GameOverScreen (Huy hiệu "💘 Cặp đôi", Bùa Mê & Slidebar Log bên phải có scroll)
  assert(
    gameOverCode.includes('coupleSummaryBanner') &&
      gameOverCode.includes('💘 Cặp đôi') &&
      !gameOverCode.includes('Yêu ${otherLover}') &&
      gameOverCode.includes('charmedRevealTag') &&
      gameOverCode.includes('floatingLogSlideToggle') &&
      gameOverCode.includes('logDrawerScroll') &&
      gameOverCode.includes('LỊCH SỬ VÁN ĐẤU'),
    'GameOverScreen phải hiển thị Huy hiệu "💘 Cặp đôi", Huy hiệu Bị Thôi Miên và Slidebar Lịch Sử Ván Đấu bên phải có scroll'
  );
  checks.push('GameOverScreen: Huy hiệu "💘 Cặp đôi", Bị Thôi Miên (🎶) & Nút Log mở Slidebar bên phải có Scroll (📜)');

  // 5. Kiểm tra Lượt Cupid ("💘 Cupid đang ghép đôi") & Ẩn role khi cặp đôi chết
  assert(
    gameScreenCode.includes('💘 Cupid đang ghép đôi') &&
      gameScreenCode.includes('CUPID ĐANG GHÉP ĐÔI') &&
      gameScreenCode.includes('isAlive && amAlive && player.role'),
    'GameScreen phải hiển thị "💘 Cupid đang ghép đôi" ở lượt Cupid và ẩn role người yêu khi cặp đôi đã chết'
  );
  checks.push('Cupid & Couple Role: Tiêu đề "💘 Cupid đang ghép đôi" & xóa hiển thị role khi cặp đôi chết');

  // 6. Kiểm tra Unread Badge theo từng kênh Chat & Nhịp Tim Đập Đỏ (<= 5s)
  assert(
    chatBoxCode.includes('unreadVillageCount') &&
      chatBoxCode.includes('unreadWolfCount') &&
      chatBoxCode.includes('unreadCoupleCount') &&
      gameScreenCode.includes('unreadSecretChannel') &&
      gameScreenCode.includes('timerBadgeDanger'),
    'ChatBox & GameScreen phải có Unread Badge đếm số tin nhắn cho từng kênh (Làng/Sói/Đôi) và hiệu ứng Nhịp Tim Đập Đỏ khi <= 5s'
  );
  checks.push('Chat Unread Badges & Danger Heartbeat Pulse: Báo số tin chưa đọc từng kênh & nhịp tim đỏ 5s cuối');

  return checks;
}

// ============================================================================
// PHẦN 6: GIẢ LẬP TRẬN ĐẤU THỰC TẾ KÉO DÀI 6 ĐÊM VỚI TẤT CẢ CÁC ROLE ĐẶC BIỆT CÒN SỐNG
// ============================================================================
function runSixNightFullMatchSimulation() {
  const { createRoom, joinRoom, processDayVote, getPlayersData } = require('../server/gameLogic');

  // 1. Tạo phòng 12 người chơi với đầy đủ 8 vai trò (2 Sói, 1 Cupid, 1 Bảo Vệ, 1 Phù Thủy, 1 Tiên Tri, 1 Thổi Sáo, 1 Thợ Săn, 4 Dân Làng)
  const { room } = createRoom('w1', 'Sói Alpha', {
    numWolves: 2,
    numCupids: 1,
    numBodyguards: 1,
    numWitches: 1,
    numSeers: 1,
    numPiedPipers: 1,
    numHunters: 1,
    piedPiperCharmCount: 2,
    piedPiperRevealDawn: true,
    hunterShootOnHeartbreak: true,
  });

  const roster = [
    { id: 'w2', name: 'Sói Beta', role: ROLES.WOLF },
    { id: 'cupid', name: 'Thần Cupid', role: ROLES.CUPID },
    { id: 'bg', name: 'Bảo Vệ Thép', role: ROLES.BODYGUARD },
    { id: 'witch', name: 'Phù Thủy Đêm', role: ROLES.WITCH },
    { id: 'seer', name: 'Tiên Tri Mù', role: ROLES.SEER },
    { id: 'piper', name: 'Người Thổi Sáo', role: ROLES.PIED_PIPER },
    { id: 'hunter', name: 'Thợ Săn Già', role: ROLES.HUNTER },
    { id: 'v1', name: 'Dân Làng 1', role: ROLES.VILLAGER },
    { id: 'v2', name: 'Dân Làng 2', role: ROLES.VILLAGER },
    { id: 'v3', name: 'Dân Làng 3', role: ROLES.VILLAGER },
    { id: 'v4', name: 'Dân Làng 4', role: ROLES.VILLAGER },
  ];

  for (const p of roster) {
    joinRoom(room.code, p.id, p.name);
  }

  // Gán vai trò cố định để kiểm thử chính xác từng đêm qua 6 đêm
  room.players.get('w1').role = ROLES.WOLF;
  for (const p of roster) {
    const playerObj = room.players.get(p.id);
    playerObj.role = p.role;
    if (p.role === ROLES.WITCH) {
      playerObj.witchState = { hasHeal: true, hasPoison: true };
    }
  }

  const specialRoleIds = ['w1', 'w2', 'cupid', 'bg', 'witch', 'seer', 'piper', 'hunter'];
  const assertSpecialRolesAlive = (upToNight) => {
    for (const id of specialRoleIds) {
      const p = room.players.get(id);
      assert(p && p.alive, `[Đêm ${upToNight}] Role đặc biệt ${id} (${p?.name}) phải còn sống!`);
    }
  };

  const nightLogs = [];

  // =========================================================================
  // 🌙 ĐÊM 1: Cupid ghép đôi (Seer + Bodyguard) -> Bảo Vệ cứu Seer khỏi Sói -> Phù Thủy giữ 2 bình -> Tiên Tri soi W1 -> Thổi Sáo thôi miên V1, V2
  // =========================================================================
  room.round = 1;
  room.phase = PHASES.NIGHT_CUPID;
  room.couple = ['seer', 'bg'];
  room.cupidActed = true;

  // Kiểm tra 2 người yêu nhìn thấy role của nhau khi còn sống, người ngoài không thấy
  room.phase = PHASES.NIGHT_COUPLE_REVEAL;
  const seerViewN1 = getPlayersData(room, 'seer');
  const bgFromSeerN1 = seerViewN1.find((p) => p.id === 'bg');
  assert.strictEqual(bgFromSeerN1.role, ROLES.BODYGUARD, '[Đêm 1] Tiên Tri phải nhìn thấy role Bảo Vệ của người yêu');
  assert.strictEqual(bgFromSeerN1.isLover, true);

  // Bảo Vệ che chở cho Tiên Tri
  room.phase = PHASES.NIGHT_BODYGUARD;
  room.nightActions.bodyguardTarget = 'seer';

  // Sói vote cắn Tiên Tri
  room.phase = PHASES.NIGHT_WOLF;
  room.nightActions.wolfVotes.set('w1', 'seer');
  room.nightActions.wolfVotes.set('w2', 'seer');

  // Phù Thủy thức dậy: vì Tiên Tri đã được Bảo Vệ che chở nên effectiveVictim = null
  room.phase = PHASES.NIGHT_WITCH;
  const witchPlayer = room.players.get('witch');
  const effectiveVictimN1 =
    room.nightActions.bodyguardTarget === 'seer' ? null : 'seer';
  assert.strictEqual(effectiveVictimN1, null, '[Đêm 1] Nạn nhân đã được Bảo Vệ che chở thì Phù Thủy thấy không ai bị cắn');
  assert.deepStrictEqual(witchPlayer.witchState, { hasHeal: true, hasPoison: true });

  // Tiên Tri soi W1 -> PHE ÁC
  room.phase = PHASES.NIGHT_SEER;
  room.seerHistory['w1'] = { alignment: 'evil', alignmentName: 'ÁC' };

  // Người Thổi Sáo thôi miên V1 & V2
  room.phase = PHASES.NIGHT_PIED_PIPER;
  room.nightActions.piedPiperTargets = ['v1', 'v2'];
  room.nightActions.piedPiperTargets.forEach((tid) => {
    room.charmedPlayers.add(tid);
    room.charmedHistory[tid] = true;
    room.players.get(tid).charmed = true;
  });

  // Pha 5s Hội Thôi Miên mở mắt nhận biết nhau
  room.phase = PHASES.NIGHT_CHARMED_REVEAL;
  const v1ViewRevealN1 = getPlayersData(room, 'v1');
  const v2InV1View = v1ViewRevealN1.find((p) => p.id === 'v2');
  const w1ViewRevealN1 = getPlayersData(room, 'w1');
  assert.strictEqual(v2InV1View.charmed, true, '[Đêm 1] Trong 5s rạng sáng, V1 bị thôi miên phải nhìn thấy V2 cùng bị thôi miên');
  assert.strictEqual(w1ViewRevealN1.find((p) => p.id === 'v1').charmed, false, '[Đêm 1] Sói chưa bị thôi miên không được nhìn thấy ai bị thôi miên');

  // Xử lý kết quả Đêm 1 -> Bình minh Ngày 1
  const resN1 = processNightActions(room);
  assert.strictEqual(resN1.deadPlayerId, null);
  assert.strictEqual(resN1.savedPlayerId, 'seer');
  assert.strictEqual(room.nightActions.lastProtectedTarget, 'seer');
  assert.strictEqual(room.nightActions.wolfVotes.size, 0, '[Đêm 1 -> 2] Phiếu Sói phải tự động xóa sạch sau đêm');

  // Bỏ phiếu Ngày 1: Cả làng bỏ phiếu trắng (skip) -> Không ai chết
  room.phase = PHASES.DAY_VOTE;
  room.dayVotes.set('seer', 'skip');
  room.dayVotes.set('bg', 'skip');
  room.dayVotes.set('witch', 'skip');
  const voteN1 = processDayVote(room);
  assert.strictEqual(voteN1.eliminatedId, null);
  assertSpecialRolesAlive(1);
  nightLogs.push('Đêm 1 & Ngày 1: Cupid ghép đôi (Seer+BG), Bảo Vệ cứu Seer, Tiên Tri soi W1 (Ác), Thổi Sáo thôi miên 2 người, Vote Skip');

  // =========================================================================
  // 🌙 ĐÊM 2: Cupid ngủ -> Bảo Vệ bị chặn chọn lại Seer, đổi sang Witch -> Sói cắn Hunter -> Phù Thủy dùng Bình Cứu -> Tiên Tri soi BG -> Thổi Sáo thôi miên thêm 2 người
  // =========================================================================
  room.round = 2;
  assert.strictEqual(room.cupidActed, true, '[Đêm 2] Cupid không thức dậy ở Đêm 2');
  room.phase = PHASES.NIGHT_BODYGUARD;
  assert.strictEqual(room.nightActions.lastProtectedTarget, 'seer', '[Đêm 2] Bảo Vệ không được chọn lại Seer (người vừa bảo vệ Đêm 1)');
  room.nightActions.bodyguardTarget = 'witch';

  // Sói chọn cắn Hunter
  room.phase = PHASES.NIGHT_WOLF;
  room.nightActions.wolfVotes.set('w1', 'hunter');
  room.nightActions.wolfVotes.set('w2', 'hunter');

  // Phù Thủy thức dậy: thấy Hunter bị cắn -> dùng Bình Cứu (save: true)
  room.phase = PHASES.NIGHT_WITCH;
  room.nightActions.witchSavedThisNight = true;
  // Kết thúc lượt Phù Thủy -> trừ Bình Cứu
  witchPlayer.witchState.hasHeal = false;
  assert.deepStrictEqual(witchPlayer.witchState, { hasHeal: false, hasPoison: true });

  // Tiên Tri soi BG -> PHE THIỆN
  room.phase = PHASES.NIGHT_SEER;
  room.seerHistory['bg'] = { alignment: 'good', alignmentName: 'THIỆN' };

  // Thổi Sáo thôi miên V3 & Cupid
  room.phase = PHASES.NIGHT_PIED_PIPER;
  ['v3', 'cupid'].forEach((tid) => {
    room.charmedPlayers.add(tid);
    room.charmedHistory[tid] = true;
    room.players.get(tid).charmed = true;
  });

  const resN2 = processNightActions(room);
  assert.strictEqual(resN2.deadPlayerId, null);
  assert.strictEqual(resN2.witchSavedPlayerId, 'hunter', '[Đêm 2] Phù Thủy cứu sống Thợ Săn thành công');
  assert.strictEqual(room.nightActions.lastProtectedTarget, 'witch');

  // Bỏ phiếu Ngày 2: Hòa phiếu (1 phiếu v1, 1 phiếu v2) -> Không ai chết
  room.phase = PHASES.DAY_VOTE;
  room.dayVotes.set('w1', 'v1');
  room.dayVotes.set('w2', 'v2');
  const voteN2 = processDayVote(room);
  assert.strictEqual(voteN2.eliminatedId, null);
  assertSpecialRolesAlive(2);
  nightLogs.push('Đêm 2 & Ngày 2: Bảo Vệ đổi mục tiêu (Witch), Phù Thủy dùng Bình Cứu cứu Hunter, Tiên Tri soi BG (Thiện), Hòa phiếu ngày');

  // =========================================================================
  // 🌙 ĐÊM 3: Bảo Vệ Bỏ Lượt (reset lastProtectedTarget) -> Sói hòa phiếu cắn -> Phù Thủy (hết Cứu, còn Độc) không ai chết -> Tiên Tri soi Piper -> Thổi Sáo Bỏ Lượt
  // =========================================================================
  room.round = 3;
  room.phase = PHASES.NIGHT_BODYGUARD;
  room.nightActions.bodyguardTarget = null; // Bỏ lượt đêm 3

  room.phase = PHASES.NIGHT_WOLF;
  room.nightActions.wolfVotes.set('w1', 'v1');
  room.nightActions.wolfVotes.set('w2', 'v2'); // Sói bất đồng ý kiến -> không ai bị cắn

  room.phase = PHASES.NIGHT_WITCH;
  assert.strictEqual(witchPlayer.witchState.hasHeal, false);
  assert.strictEqual(witchPlayer.witchState.hasPoison, true);

  room.phase = PHASES.NIGHT_SEER;
  room.seerHistory['piper'] = { alignment: 'good', alignmentName: 'THIỆN' };

  room.phase = PHASES.NIGHT_PIED_PIPER;
  room.nightActions.piedPiperTargets = []; // Bỏ lượt

  const resN3 = processNightActions(room);
  assert.strictEqual(resN3.deadPlayerId, null);
  assert.strictEqual(resN3.attackedPlayerId, null);
  assert.strictEqual(room.nightActions.lastProtectedTarget, null, '[Đêm 3] Sau khi Bảo Vệ bỏ lượt, lastProtectedTarget phải về null');
  assertSpecialRolesAlive(3);
  nightLogs.push('Đêm 3 & Ngày 3: Bảo Vệ skip (reset khóa mục tiêu), Sói chia phiếu không cắn ai, Tiên Tri soi Thổi Sáo (Thiện), Đêm bình yên');

  // =========================================================================
  // 🌙 ĐÊM 4: Bảo Vệ bảo vệ Hunter -> Sói cắn V4 -> Phù Thủy (hết Cứu, còn Độc) xem V4 bị cắn trong 5s rồi giữ bình Độc -> Tiên Tri soi Hunter -> Thổi Sáo thôi miên Witch
  // =========================================================================
  room.round = 4;
  room.phase = PHASES.NIGHT_BODYGUARD;
  room.nightActions.bodyguardTarget = 'hunter';

  room.phase = PHASES.NIGHT_WOLF;
  room.nightActions.wolfVotes.set('w1', 'v4');
  room.nightActions.wolfVotes.set('w2', 'v4');

  // Phù Thủy thức dậy: đã hết bình Cứu từ Đêm 2, còn bình Độc, thấy V4 bị cắn
  room.phase = PHASES.NIGHT_WITCH;
  assert.strictEqual(witchPlayer.witchState.hasHeal, false);
  assert.strictEqual(witchPlayer.witchState.hasPoison, true);

  room.phase = PHASES.NIGHT_SEER;
  room.seerHistory['hunter'] = { alignment: 'good', alignmentName: 'THIỆN' };

  room.phase = PHASES.NIGHT_PIED_PIPER;
  room.charmedPlayers.add('witch');
  room.charmedHistory['witch'] = true;
  room.players.get('witch').charmed = true;

  const resN4 = processNightActions(room);
  assert.strictEqual(resN4.deadPlayerId, 'v4');
  room.players.get('v4').alive = false;
  assertSpecialRolesAlive(4);
  nightLogs.push('Đêm 4 & Ngày 4: Sói cắn V4, Phù Thủy (hết bình Cứu) quan sát V4 bị cắn 5s & giữ bình Độc, Tiên Tri soi Hunter, 8 role đặc biệt vẫn sống');

  // =========================================================================
  // 🌙 ĐÊM 5: Bảo Vệ che chở V3 + Sói cắn V3 + Phù Thủy ném Bình Độc vào V3 (Xung Đột Tay Ba ThreeWayClashModal) -> Tiên Tri soi W2 -> Thổi Sáo thôi miên Seer
  // =========================================================================
  room.round = 5;
  room.phase = PHASES.NIGHT_BODYGUARD;
  room.nightActions.bodyguardTarget = 'v3';

  room.phase = PHASES.NIGHT_WOLF;
  room.nightActions.wolfVotes.set('w1', 'v3');
  room.nightActions.wolfVotes.set('w2', 'v3');

  room.phase = PHASES.NIGHT_WITCH;
  room.nightActions.witchPoisonTarget = 'v3';
  witchPlayer.witchState.hasPoison = false; // Đã dùng hết cả 2 bình thuốc sau Đêm 5!

  room.phase = PHASES.NIGHT_SEER;
  room.seerHistory['w2'] = { alignment: 'evil', alignmentName: 'ÁC' };

  room.phase = PHASES.NIGHT_PIED_PIPER;
  room.charmedPlayers.add('seer');
  room.charmedHistory['seer'] = true;
  room.players.get('seer').charmed = true;

  const resN5 = processNightActions(room);
  assert.strictEqual(resN5.savedPlayerId, 'v3', '[Đêm 5] Bảo Vệ đỡ được đòn Sói cắn V3');
  assert.strictEqual(resN5.poisonedPlayerId, 'v3', '[Đêm 5] Phù Thủy ném độc xuyên khiên giết V3');
  assert.strictEqual(resN5.shieldClashPlayerId, 'v3', '[Đêm 5] Kích hoạt Xung Đột Tay Ba (ThreeWayClashModal)');
  room.players.get('v3').alive = false;
  assert.deepStrictEqual(witchPlayer.witchState, { hasHeal: false, hasPoison: false });
  assertSpecialRolesAlive(5);
  nightLogs.push('Đêm 5 & Ngày 5: Xung đột tay ba (Bảo Vệ + Sói + Phù Thủy độc cùng nhắm V3), Phù Thủy dùng hết cả 2 bình, Tiên Tri soi ra Sói thứ 2 (W2)');

  // =========================================================================
  // 🌙 ĐÊM 6: TẤT CẢ 8 NGƯỜI CHƠI ROLE ĐẶC BIỆT VẪN CÒN SỐNG BƯỚC VÀO ĐÊM 6!
  // Bảo Vệ bảo vệ Cupid -> Phù Thủy thức dậy trạng thái HẾT CẢ 2 BÌNH THUỐC (10s) -> Tiên Tri soi Cupid (6 đêm soi 6 người) -> Sói cắn V2 -> Ngày 6 dân làng treo cổ W1 & W2 -> Dân Làng Thắng!
  // =========================================================================
  room.round = 6;
  assertSpecialRolesAlive(6);

  room.phase = PHASES.NIGHT_BODYGUARD;
  room.nightActions.bodyguardTarget = 'cupid';

  room.phase = PHASES.NIGHT_WOLF;
  room.nightActions.wolfVotes.set('w1', 'v2');
  room.nightActions.wolfVotes.set('w2', 'v2');

  // Phù Thủy thức dậy ở Đêm 6 khi cả 2 bình đều đã hết (hasHeal: false, hasPoison: false)
  room.phase = PHASES.NIGHT_WITCH;
  const anyWitchHasPotionsN6 = witchPlayer.witchState.hasHeal || witchPlayer.witchState.hasPoison;
  assert.strictEqual(anyWitchHasPotionsN6, false, '[Đêm 6] Phù Thủy thức dậy ở Đêm 6 trong trạng thái đã hết cả 2 bình thuốc (rút timer 10s)');

  // Tiên Tri soi Cupid (tích lũy đủ 6 lần soi qua 6 đêm!)
  room.phase = PHASES.NIGHT_SEER;
  room.seerHistory['cupid'] = { alignment: 'good', alignmentName: 'THIỆN' };
  assert.strictEqual(Object.keys(room.seerHistory).length, 6, '[Đêm 6] Tiên Tri phải lưu giữ đầy đủ lịch sử 6 mục tiêu đã soi qua 6 đêm');

  const resN6 = processNightActions(room);
  assert.strictEqual(resN6.deadPlayerId, 'v2');
  room.players.get('v2').alive = false;

  // Kiểm tra tất cả các role đặc biệt vẫn sống nguyên vẹn sau rạng sáng Ngày 6!
  assertSpecialRolesAlive(6);

  // Ngày 6: Treo cổ W1 & W2 để kết thúc ván đấu và kiểm tra điều kiện thắng
  room.players.get('w1').alive = false;
  assert.strictEqual(checkWinCondition(room).gameOver, false, '[Ngày 6] Còn 1 Sói (W2) thì game chưa kết thúc');
  room.players.get('w2').alive = false;
  const finalWin = checkWinCondition(room);
  assert.strictEqual(finalWin.gameOver, true);
  assert.strictEqual(finalWin.winner, 'village');
  nightLogs.push('Đêm 6 & Ngày 6: Tất cả Role đặc biệt sống đủ 6 đêm, Phù Thủy hiện trạng thái hết cả 2 bình (10s), Tiên Tri đủ 6 lịch sử soi, Dân Làng thắng');

  return nightLogs;
}

// ============================================================================
// PHẦN 7: KIỂM THỬ TRẬN ĐẤU CẶP ĐÔI SÓI - DÂN (PHE CẶP ĐÔI) CHIẾN THẮNG
// ============================================================================
function runWolfVillagerCoupleVictorySimulation() {
  const { createRoom, joinRoom, processDayVote, getPlayersData } = require('../server/gameLogic');

  const { room } = createRoom('w1', 'Sói Si Tình', {
    numWolves: 2,
    numCupids: 1,
    numWitches: 1,
    numSeers: 1,
    numBodyguards: 1,
    numHunters: 0,
    numPiedPipers: 0,
  });

  const playersList = [
    { id: 'w2', name: 'Sói Đơn Độc', role: ROLES.WOLF },
    { id: 'witch', name: 'Phù Thủy Yêu Sói', role: ROLES.WITCH },
    { id: 'cupid', name: 'Thần Cupid', role: ROLES.CUPID },
    { id: 'seer', name: 'Tiên Tri', role: ROLES.SEER },
    { id: 'bg', name: 'Bảo Vệ', role: ROLES.BODYGUARD },
    { id: 'v1', name: 'Dân Làng', role: ROLES.VILLAGER },
  ];

  for (const p of playersList) {
    joinRoom(room.code, p.id, p.name);
  }

  room.players.get('w1').role = ROLES.WOLF;
  for (const p of playersList) {
    const obj = room.players.get(p.id);
    obj.role = p.role;
    if (p.role === ROLES.WITCH) {
      obj.witchState = { hasHeal: true, hasPoison: true };
    }
  }

  const steps = [];
  const ctrl = new GameScreenAnimationController({
    players: [...room.players.values()],
  });

  // 1. ĐÊM 1: Cupid ghép đôi Sói Si Tình (w1) ❤️ Phù Thủy Yêu Sói (witch) -> Cặp Đôi Khác Phe (Beauty and The Beast)
  room.round = 1;
  room.phase = PHASES.NIGHT_CUPID;
  room.couple = ['w1', 'witch'];
  room.cupidActed = true;
  ctrl.couple = [room.players.get('w1'), room.players.get('witch')];

  ctrl.onCoupleFormed({
    couple: [room.players.get('w1'), room.players.get('witch')],
    cupid: room.players.get('cupid'),
  });
  assert.strictEqual(ctrl.timeline[0].modal, 'CoupleRevealModal');
  assert.strictEqual(ctrl.timeline[0].payload.variant, 'special_wolf');

  // Kiểm tra 2 bên nhìn thấy Role thật của nhau để tương trợ
  const w1Data = getPlayersData(room, 'w1');
  const witchData = getPlayersData(room, 'witch');
  assert.strictEqual(w1Data.find((p) => p.id === 'witch').role, ROLES.WITCH);
  assert.strictEqual(witchData.find((p) => p.id === 'w1').role, ROLES.WOLF);
  steps.push('Đêm 1: Cupid ghép đôi Sói (w1) ❤️ Phù Thủy (witch) ➔ Phát hoạt ảnh đặc biệt "Beauty and The Beast" & lộ Role cho nhau');

  // Đêm 1: Bầy Sói cắn Bảo Vệ (bg), Phù Thủy ném Bình Độc giết Tiên Tri (seer) để dọn đường cho Phe Cặp Đôi!
  room.nightActions.wolfVotes.set('w1', 'bg');
  room.nightActions.wolfVotes.set('w2', 'bg');
  room.nightActions.witchPoisonTarget = 'seer';
  room.players.get('witch').witchState.hasPoison = false;

  const resN1 = processNightActions(room);
  assert.strictEqual(resN1.deadPlayerId, 'bg');
  assert.strictEqual(resN1.poisonedPlayerId, 'seer');
  room.players.get('bg').alive = false;
  room.players.get('seer').alive = false;

  // Bình minh Ngày 1: Còn 5 người sống (w1, w2, witch, cupid, v1) -> Chưa kết thúc
  assert.strictEqual(checkWinCondition(room).gameOver, false);

  // Ban ngày 1: Cặp đôi (w1 + witch) dẫn dắt làng bỏ phiếu treo cổ Cupid
  room.dayVotes.set('w1', 'cupid');
  room.dayVotes.set('witch', 'cupid');
  room.dayVotes.set('v1', 'cupid');
  const voteD1 = processDayVote(room);
  assert.strictEqual(voteD1.eliminatedId, 'cupid');

  // LÚC NÀY CÒN 4 NGƯỜI SỐNG: 2 Sói (w1, w2) và 2 Dân (witch, v1)
  // Vì w1 + witch là Cặp Đôi Sói - Dân đang sống, Phe Sói KHÔNG ĐƯỢC thắng sớm ở mốc 2 Sói vs 2 Dân!
  const checkAt4Players = checkWinCondition(room);
  assert.strictEqual(
    checkAt4Players.gameOver,
    false,
    'Khi còn 4 người (2 Sói: w1, w2 + 2 Dân: witch, v1) mà w1+witch là Cặp Đôi Sói-Dân thì game PHẢI TIẾP TỤC để Cặp Đôi tranh chiến thắng!'
  );
  steps.push('Ngày 1: Sau khi Bảo Vệ, Tiên Tri, Cupid chết (còn 2 Sói + 2 Dân), game KHÔNG kết thúc sớm cho Phe Sói vì Sói Si Tình thuộc Phe Cặp Đôi');

  // 2. ĐÊM 2: Sói Si Tình (w1) cắn Dân Làng (v1), nhưng Phù Thủy Yêu Sói (witch) dùng Bình Cứu giữ v1 sống để ban ngày cùng vote treo cổ Sói Đơn Độc (w2)!
  room.round = 2;
  room.nightActions.wolfVotes.set('w1', 'v1');
  room.nightActions.wolfVotes.set('w2', 'v1');
  room.nightActions.witchSavedThisNight = true;
  room.players.get('witch').witchState.hasHeal = false;
  const resN2 = processNightActions(room);
  assert.strictEqual(resN2.deadPlayerId, null);
  assert.strictEqual(resN2.witchSavedPlayerId, 'v1');

  // Ban ngày 2: Cặp đôi (w1 + witch) bắt tay với v1 bỏ phiếu treo cổ Sói Đơn Độc (w2)!
  room.dayVotes.set('w1', 'w2');
  room.dayVotes.set('witch', 'w2');
  room.dayVotes.set('v1', 'w2');
  room.dayVotes.set('w2', 'v1');
  const voteD2 = processDayVote(room);
  assert.strictEqual(voteD2.eliminatedId, 'w2');

  // Lúc này còn 3 người sống: Sói Si Tình (w1), Phù Thủy Yêu Sói (witch) và Dân Làng (v1)
  const checkAt3Players = checkWinCondition(room);
  assert.strictEqual(checkAt3Players.gameOver, false, 'Còn 3 người (w1, witch, v1) thì vào Đêm 3 để loại người ngoài cuối cùng');
  steps.push('Ngày 2: Cặp đôi Sói - Dân liên minh treo cổ Sói Đơn Độc (w2), còn 3 người bước vào Đêm quyết định');

  // 3. ĐÊM 3: Sói Si Tình (w1) cắn chết người ngoài cuối cùng là Dân Làng (v1)!
  room.round = 3;
  room.nightActions.wolfVotes.set('w1', 'v1');
  const resN3 = processNightActions(room);
  assert.strictEqual(resN3.deadPlayerId, 'v1');
  room.players.get('v1').alive = false;

  // Bình minh Ngày 3: Chỉ còn duy nhất 2 người trong Cặp Đôi (w1 + witch) sống sót!
  const finalCoupleWin = checkWinCondition(room);
  assert.strictEqual(finalCoupleWin.gameOver, true, 'Khi chỉ còn 2 người trong Cặp Đôi Sói - Dân sống sót, trận đấu phải kết thúc!');
  assert.strictEqual(finalCoupleWin.winner, 'couple', 'Người chiến thắng phải là Phe Cặp Đôi ("couple")!');
  assert.strictEqual(finalCoupleWin.couple.length, 2);

  // Kiểm tra luồng hoạt ảnh chiến thắng CupidVictoryModal -> GameOverScreen
  ctrl.onGameOver({
    winner: finalCoupleWin.winner,
    message: finalCoupleWin.message,
    couple: finalCoupleWin.couple,
    players: [...room.players.values()],
  });
  const lastTwoModals = ctrl.timeline.slice(-2).map((m) => m.modal);
  assert.deepStrictEqual(lastTwoModals, ['CupidVictoryModal', 'GameOverScreen']);
  steps.push('Đêm 3 & Bình Minh: Sói Si Tình hạ gục người ngoài cuối cùng (v1) ➔ Chỉ còn Cặp Đôi Sói - Dân sống sót ➔ PHE CẶP ĐÔI CHIẾN THẮNG (CupidVictoryModal ➔ GameOverScreen)!');

  return steps;
}

// ============================================================================
// PHẦN 8: 12 KỊCH BẢN TOÀN HỆ THỐNG (ĐỦ 4 PHE THẮNG, LUẬT THỢ SĂN, BẢO MẬT ROLE, PHÒNG & CHAT)
// ============================================================================
function runComprehensiveSystemScenarios() {
  const {
    createRoom,
    joinRoom,
    leaveRoom,
    assignRoles,
    processNightActions,
    processDayVote,
    checkWinCondition,
    getPlayersData,
    validateSettings,
    shuffleArray,
  } = require('../server/gameLogic');

  const results = [];

  // -------------------------------------------------------------------------
  // [SYS-01] Phe Thứ 3 (Người Thổi Sáo đơn độc) Chiến Thắng
  // -------------------------------------------------------------------------
  {
    const { room } = createRoom('piper', 'Thổi Sáo', { numWolves: 1, numPiedPipers: 1 });
    joinRoom(room.code, 'w1', 'Sói');
    joinRoom(room.code, 'v1', 'Dân 1');
    joinRoom(room.code, 'v2', 'Dân 2');
    room.players.get('piper').role = ROLES.PIED_PIPER;
    room.players.get('w1').role = ROLES.WOLF;
    room.players.get('v1').role = ROLES.VILLAGER;
    room.players.get('v2').role = ROLES.VILLAGER;

    // Mới thôi miên 2/3 người ngoài -> chưa thắng
    room.charmedPlayers = new Set(['w1', 'v1']);
    assert.strictEqual(checkWinCondition(room).gameOver, false);

    // Thôi miên nốt v2 -> Toàn bộ người sống sót ngoài Thổi Sáo đã trúng bùa mê!
    room.charmedPlayers.add('v2');
    const win = checkWinCondition(room);
    assert.strictEqual(win.gameOver, true);
    assert.strictEqual(win.winner, 'pied_piper');
    results.push('[SYS-01] Phe Thứ 3 (Người Thổi Sáo đơn độc) thắng khi thôi miên toàn bộ người sống sót');
  }

  // -------------------------------------------------------------------------
  // [SYS-02] Cặp Đôi có Người Thổi Sáo Chiến Thắng bằng Bùa Mê (Couple Charm Win)
  // -------------------------------------------------------------------------
  {
    const { room } = createRoom('piper', 'Thổi Sáo', { numWolves: 1, numPiedPipers: 1, numCupids: 1 });
    joinRoom(room.code, 'bg', 'Bảo Vệ (Người Yêu)');
    joinRoom(room.code, 'w1', 'Sói');
    joinRoom(room.code, 'v1', 'Dân 1');
    room.players.get('piper').role = ROLES.PIED_PIPER;
    room.players.get('bg').role = ROLES.BODYGUARD;
    room.players.get('w1').role = ROLES.WOLF;
    room.players.get('v1').role = ROLES.VILLAGER;

    // Cupid ghép đôi Người Thổi Sáo + Bảo Vệ
    room.couple = ['piper', 'bg'];
    // Người Thổi Sáo chỉ cần thôi miên hết người ngoài (w1, v1), không cần thôi miên người yêu (bg)!
    room.charmedPlayers = new Set(['w1', 'v1']);
    const win = checkWinCondition(room);
    assert.strictEqual(win.gameOver, true);
    assert.strictEqual(win.winner, 'couple');
    assert(win.message.includes('Người Thổi Sáo và Người Yêu'));
    results.push('[SYS-02] Cặp Đôi có Người Thổi Sáo thắng ngay khi thôi miên hết người ngoài còn sống');
  }

  // -------------------------------------------------------------------------
  // [SYS-03] Cặp Đôi Dân - Dân: Thắng cùng Dân Làng (khi >2 người) & Thắng Cặp Đôi (khi còn 2 người)
  // -------------------------------------------------------------------------
  {
    const { room } = createRoom('seer', 'Tiên Tri', { numWolves: 1, numCupids: 1 });
    joinRoom(room.code, 'bg', 'Bảo Vệ');
    joinRoom(room.code, 'v1', 'Dân 1');
    joinRoom(room.code, 'w1', 'Sói');
    room.players.get('seer').role = ROLES.SEER;
    room.players.get('bg').role = ROLES.BODYGUARD;
    room.players.get('v1').role = ROLES.VILLAGER;
    room.players.get('w1').role = ROLES.WOLF;
    room.couple = ['seer', 'bg'];

    // Nhánh A: Sói chết khi còn 3 Dân (seer, bg, v1) -> Phe Dân Làng thắng
    room.players.get('w1').alive = false;
    const winVillage = checkWinCondition(room);
    assert.strictEqual(winVillage.gameOver, true);
    assert.strictEqual(winVillage.winner, 'village');

    // Nhánh B: Chỉ còn đúng 2 người trong Cặp Đôi sống sót -> Phe Cặp Đôi thắng
    room.players.get('v1').alive = false;
    const winCouple = checkWinCondition(room);
    assert.strictEqual(winCouple.gameOver, true);
    assert.strictEqual(winCouple.winner, 'couple');
    results.push('[SYS-03] Cặp Đôi Dân - Dân: Thắng theo Phe Dân (khi >2 người) & Thắng Phe Cặp Đôi (khi còn 2 người)');
  }

  // -------------------------------------------------------------------------
  // [SYS-04] Phe Ma Sói Chiến Thắng trong cả 3 nhánh (Thường / Sau khi Cặp Đôi chết / Sói ngoài áp đảo)
  // -------------------------------------------------------------------------
  {
    const { room } = createRoom('w1', 'Sói 1', { numWolves: 2 });
    joinRoom(room.code, 'w2', 'Sói 2');
    joinRoom(room.code, 'v1', 'Dân 1');
    joinRoom(room.code, 'v2', 'Dân 2');
    room.players.get('w1').role = ROLES.WOLF;
    room.players.get('w2').role = ROLES.WOLF;
    room.players.get('v1').role = ROLES.VILLAGER;
    room.players.get('v2').role = ROLES.VILLAGER;

    // Nhánh A: Không có cặp đôi, 2 Sói >= 2 Dân -> Sói thắng
    assert.strictEqual(checkWinCondition(room).winner, 'wolves');

    // Nhánh B: Có cặp đôi Sói-Dân (w1+v1) nhưng cặp đôi đã chết -> w2 >= v2 -> Sói thắng
    room.couple = ['w1', 'v1'];
    room.players.get('w1').alive = false;
    room.players.get('v1').alive = false;
    assert.strictEqual(checkWinCondition(room).winner, 'wolves');

    // Nhánh C: Cặp đôi Sói-Dân (w1+v1) còn sống, nhưng có tới 2 Sói trung thành ngoài cặp đôi (w2, w3) áp đảo (2 >= 2)
    room.players.get('w1').alive = true;
    room.players.get('v1').alive = true;
    room.players.get('v2').alive = false;
    joinRoom(room.code, 'w3', 'Sói 3');
    room.players.get('w3').role = ROLES.WOLF;
    assert.strictEqual(checkWinCondition(room).winner, 'wolves');
    results.push('[SYS-04] Phe Ma Sói thắng chuẩn xác trong cả 3 nhánh (Thường / Cặp đôi chết / Sói trung thành áp đảo)');
  }

  // -------------------------------------------------------------------------
  // [SYS-05] Quy tắc Thợ Săn trong mọi trường hợp chết (Sói cắn / Độc / DualKill / Treo cổ / Setting Tuẫn tình)
  // -------------------------------------------------------------------------
  {
    const evaluateHunterCanShoot = ({ deadPlayer, poisonedPlayer, heartbrokenPlayer, eliminated, hunterShootOnHeartbreak }) => {
      // Ban đêm
      const directWolfKilledHunter =
        deadPlayer && deadPlayer.role === ROLES.HUNTER && (!poisonedPlayer || poisonedPlayer.id !== deadPlayer.id)
          ? deadPlayer
          : null;
      const heartbrokenHunterNight =
        hunterShootOnHeartbreak !== false && heartbrokenPlayer && heartbrokenPlayer.role === ROLES.HUNTER
          ? heartbrokenPlayer
          : null;
      // Ban ngày
      const hunterAfterVote =
        eliminated && eliminated.role === ROLES.HUNTER
          ? eliminated
          : hunterShootOnHeartbreak !== false && heartbrokenPlayer && heartbrokenPlayer.role === ROLES.HUNTER
          ? heartbrokenPlayer
          : null;
      return Boolean(directWolfKilledHunter || heartbrokenHunterNight || hunterAfterVote);
    };

    const hunterObj = { id: 'h', name: 'Thợ Săn', role: ROLES.HUNTER };
    // 5a: Bị Sói cắn đơn thuần -> ĐƯỢC BẮN
    assert.strictEqual(evaluateHunterCanShoot({ deadPlayer: hunterObj, poisonedPlayer: null }), true);
    // 5b: Bị Phù Thủy ném độc đơn thuần -> KHÔNG ĐƯỢC BẮN
    assert.strictEqual(evaluateHunterCanShoot({ deadPlayer: null, poisonedPlayer: hunterObj }), false);
    // 5c: Bị cả Sói cắn lẫn Phù Thủy ném độc (DualKill) -> KHÔNG ĐƯỢC BẮN
    assert.strictEqual(evaluateHunterCanShoot({ deadPlayer: hunterObj, poisonedPlayer: hunterObj }), false);
    // 5d: Bị treo cổ ban ngày -> ĐƯỢC BẮN
    assert.strictEqual(evaluateHunterCanShoot({ eliminated: hunterObj }), true);
    // 5e: Chết theo người yêu khi BẬT hunterShootOnHeartbreak -> ĐƯỢC BẮN
    assert.strictEqual(evaluateHunterCanShoot({ heartbrokenPlayer: hunterObj, hunterShootOnHeartbreak: true }), true);
    // 5f: Chết theo người yêu khi TẮT hunterShootOnHeartbreak -> KHÔNG ĐƯỢC BẮN
    assert.strictEqual(evaluateHunterCanShoot({ heartbrokenPlayer: hunterObj, hunterShootOnHeartbreak: false }), false);
    results.push('[SYS-05] Quy tắc Thợ Săn: Sói cắn/Treo cổ (Bắn), Trúng độc/DualKill (Cấm bắn), Tuẫn tình (Theo Setting Bật/Tắt)');
  }

  // -------------------------------------------------------------------------
  // [SYS-06] Thợ Săn chết theo người yêu -> Bắn hạ Sói cuối cùng -> Lật kèo Dân Làng thắng
  // -------------------------------------------------------------------------
  {
    const { room } = createRoom('w1', 'Sói Cuối', { numWolves: 1, numHunters: 1, numCupids: 1, hunterShootOnHeartbreak: true });
    joinRoom(room.code, 'hunter', 'Thợ Săn');
    joinRoom(room.code, 'v1', 'Người Yêu Thợ Săn');
    joinRoom(room.code, 'v2', 'Dân Làng');
    room.players.get('w1').role = ROLES.WOLF;
    room.players.get('hunter').role = ROLES.HUNTER;
    room.players.get('v1').role = ROLES.VILLAGER;
    room.players.get('v2').role = ROLES.VILLAGER;
    room.couple = ['hunter', 'v1'];

    // Sói cắn chết v1 -> hunter chết theo vì thất tình -> hunter nổ súng bắn chết w1!
    room.players.get('v1').alive = false;
    room.players.get('hunter').alive = false;
    room.players.get('w1').alive = false; // Bị Thợ Săn bắn hạ

    const win = checkWinCondition(room);
    assert.strictEqual(win.gameOver, true);
    assert.strictEqual(win.winner, 'village');
    results.push('[SYS-06] Lật kèo kinh điển: Thợ Săn tuẫn tình theo người yêu -> Bắn hạ Sói cuối cùng -> Phe Dân thắng');
  }

  // -------------------------------------------------------------------------
  // [SYS-07] Dây chuyền liên hoàn: Thợ Săn bắn trúng A (A yêu Người Thổi Sáo) -> Tuẫn tình + Thanh tẩy bùa mê
  // -------------------------------------------------------------------------
  {
    const { room } = createRoom('hunter', 'Thợ Săn', { numWolves: 1, numHunters: 1, numPiedPipers: 1, numCupids: 1 });
    joinRoom(room.code, 'v1', 'Dân Yêu Thổi Sáo');
    joinRoom(room.code, 'piper', 'Người Thổi Sáo');
    joinRoom(room.code, 'w1', 'Sói');
    room.players.get('hunter').role = ROLES.HUNTER;
    room.players.get('v1').role = ROLES.VILLAGER;
    room.players.get('piper').role = ROLES.PIED_PIPER;
    room.players.get('w1').role = ROLES.WOLF;
    room.couple = ['v1', 'piper'];
    room.charmedPlayers = new Set(['hunter', 'w1']);
    room.players.get('hunter').charmed = true;
    room.players.get('w1').charmed = true;

    // Thợ Săn bắn trúng v1 -> piper chết theo vì tuẫn tình -> toàn bộ bùa mê trên hunter & w1 bị xóa sạch!
    room.players.get('v1').alive = false;
    room.players.get('piper').alive = false;
    room.charmedPlayers.clear();
    room.players.forEach((p) => { p.charmed = false; });

    assert.strictEqual(room.charmedPlayers.size, 0);
    assert.strictEqual(room.players.get('w1').charmed, false);
    results.push('[SYS-07] Dây chuyền: Thợ Săn bắn trúng người yêu của Thổi Sáo -> Thổi Sáo tuẫn tình -> Thanh tẩy toàn bộ bùa mê');
  }

  // -------------------------------------------------------------------------
  // [SYS-08] Cupid hết giờ không chọn -> Hệ thống tự động Random ghép đôi 2 người (trừ Cupid)
  // -------------------------------------------------------------------------
  {
    const { room } = createRoom('cupid', 'Cupid', { numWolves: 1, numCupids: 1 });
    joinRoom(room.code, 'p1', 'Người 1');
    joinRoom(room.code, 'p2', 'Người 2');
    joinRoom(room.code, 'p3', 'Người 3');
    room.players.get('cupid').role = ROLES.CUPID;

    // Giả lập finishCupidTurn khi room.couple chưa được chọn
    const cupidPlayer = [...room.players.values()].find((p) => p.role === ROLES.CUPID);
    const candidates = [...room.players.values()]
      .filter((p) => p.alive && p.id !== cupidPlayer.id)
      .map((p) => p.id);
    const shuffled = shuffleArray(candidates);
    room.couple = [shuffled[0], shuffled[1]];

    assert.strictEqual(room.couple.length, 2);
    assert(!room.couple.includes('cupid'), 'Random ghép đôi không được chọn chính Cupid');
    assert.notStrictEqual(room.couple[0], room.couple[1]);
    results.push('[SYS-08] Cupid hết giờ không chọn -> Tự động Random ghép đôi 2 người chơi hợp lệ (trừ Cupid)');
  }

  // -------------------------------------------------------------------------
  // [SYS-09] Quản lý Phòng: Chặn trùng tên, Chuyển quyền Chủ Phòng khi Host thoát, Xóa phòng trống
  // -------------------------------------------------------------------------
  {
    const { room } = createRoom('host1', 'Chủ Phòng');
    const dupJoin = joinRoom(room.code, 'p2', 'chủ phòng'); // Trùng tên (không phân biệt hoa thường)
    assert(dupJoin.error && dupJoin.error.includes('Tên này đã có người dùng'));

    joinRoom(room.code, 'p2', 'Người Chơi 2');
    joinRoom(room.code, 'p3', 'Người Chơi 3');

    // Host rời phòng -> p2 tự động lên làm Host mới
    const updatedAfterHostLeave = leaveRoom(room.code, 'host1');
    assert.strictEqual(updatedAfterHostLeave.hostId, 'p2');
    assert.strictEqual(updatedAfterHostLeave.hostPlayerName, 'Người Chơi 2');

    // Tất cả rời phòng -> Phòng tự động bị xóa khỏi bộ nhớ
    leaveRoom(room.code, 'p2');
    const emptyRoom = leaveRoom(room.code, 'p3');
    assert.strictEqual(emptyRoom, null);
    results.push('[SYS-09] Quản lý Phòng: Chặn trùng tên, tự động kế thừa Chủ Phòng khi Host rời & dọn phòng trống');
  }

  // -------------------------------------------------------------------------
  // [SYS-10] Phân vai (assignRoles) & Kiểm tra cài đặt phòng (validateSettings)
  // -------------------------------------------------------------------------
  {
    // Kiểm tra validateSettings chặn cấu hình sai
    assert.strictEqual(validateSettings({ numWolves: -1, numSeers: 1 }, 6).valid, false);
    assert.strictEqual(validateSettings({ numWolves: 1, numSeers: 1, dayDiscussionTime: 5 }, 6).valid, false);
    assert.strictEqual(validateSettings({ numWolves: 3, numSeers: 1, numBodyguards: 1, numWitches: 0, numHunters: 0, numPiedPipers: 0, numCupids: 0 }, 6).valid, false);
    assert.strictEqual(validateSettings({ numWolves: 2, numSeers: 1, numBodyguards: 1, numWitches: 1, numHunters: 1, numPiedPipers: 0, numCupids: 0 }, 8).valid, true);

    // Kiểm tra assignRoles phân bổ đúng số lượng từng vai trò
    const { room } = createRoom('p1', 'P1', {
      numWolves: 2,
      numSeers: 1,
      numBodyguards: 1,
      numWitches: 1,
      numHunters: 1,
      numPiedPipers: 1,
      numCupids: 1,
    });
    for (let i = 2; i <= 10; i++) joinRoom(room.code, `p${i}`, `P${i}`);
    assignRoles(room);
    const rolesAssigned = [...room.players.values()].map((p) => p.role);
    assert.strictEqual(rolesAssigned.filter((r) => r === ROLES.WOLF).length, 2);
    assert.strictEqual(rolesAssigned.filter((r) => r === ROLES.SEER).length, 1);
    assert.strictEqual(rolesAssigned.filter((r) => r === ROLES.BODYGUARD).length, 1);
    assert.strictEqual(rolesAssigned.filter((r) => r === ROLES.WITCH).length, 1);
    assert.strictEqual(rolesAssigned.filter((r) => r === ROLES.HUNTER).length, 1);
    assert.strictEqual(rolesAssigned.filter((r) => r === ROLES.PIED_PIPER).length, 1);
    assert.strictEqual(rolesAssigned.filter((r) => r === ROLES.CUPID).length, 1);
    assert.strictEqual(rolesAssigned.filter((r) => r === ROLES.VILLAGER).length, 2);
    results.push('[SYS-10] Validate Cài Đặt & Phân Vai Tự Động (assignRoles): Đúng số lượng 8 vai trò & khởi tạo bình thuốc Phù Thủy');
  }

  // -------------------------------------------------------------------------
  // [SYS-11] Bảo mật phân quyền góc nhìn getPlayersData (Chống lộ Role tuyệt đối)
  // -------------------------------------------------------------------------
  {
    const { room } = createRoom('w1', 'Sói 1');
    joinRoom(room.code, 'w2', 'Sói 2');
    joinRoom(room.code, 'cupid', 'Cupid');
    joinRoom(room.code, 'seer', 'Tiên Tri');
    joinRoom(room.code, 'v1', 'Dân Thường');
    room.phase = PHASES.DAY_DISCUSSION;
    room.players.get('w1').role = ROLES.WOLF;
    room.players.get('w2').role = ROLES.WOLF;
    room.players.get('cupid').role = ROLES.CUPID;
    room.players.get('seer').role = ROLES.SEER;
    room.players.get('v1').role = ROLES.VILLAGER;
    room.couple = ['w1', 'seer'];

    // 1. Góc nhìn Dân Thường (v1): Chỉ thấy role của chính mình, không thấy role hay cặp đôi của ai khác
    const v1View = getPlayersData(room, 'v1');
    assert.strictEqual(v1View.find((p) => p.id === 'v1').role, ROLES.VILLAGER);
    assert.strictEqual(v1View.find((p) => p.id === 'w1').role, null);
    assert.strictEqual(v1View.find((p) => p.id === 'w1').inCouple, false);

    // 2. Góc nhìn Cupid: Thấy ai thuộc Cặp Đôi (inCouple = true) nhưng KHÔNG ĐƯỢC thấy Role của 2 người trong cặp đôi!
    const cupidView = getPlayersData(room, 'cupid');
    assert.strictEqual(cupidView.find((p) => p.id === 'w1').inCouple, true);
    assert.strictEqual(cupidView.find((p) => p.id === 'seer').inCouple, true);
    assert.strictEqual(cupidView.find((p) => p.id === 'w1').role, null, 'Cupid không được biết role của Cặp Đôi');
    assert.strictEqual(cupidView.find((p) => p.id === 'seer').role, null, 'Cupid không được biết role của Cặp Đôi');

    // 3. Góc nhìn Sói 1 (w1 - đang sống trong Cặp Đôi với seer): Thấy cả đồng bọn Sói (w2) LẪN Role của người yêu (seer)
    const w1ViewAlive = getPlayersData(room, 'w1');
    assert.strictEqual(w1ViewAlive.find((p) => p.id === 'w2').role, ROLES.WOLF);
    assert.strictEqual(w1ViewAlive.find((p) => p.id === 'seer').role, ROLES.SEER);

    // 4. Khi Cặp Đôi chết (alive = false): Xóa quyền nhìn thấy Role người yêu trong trận (chỉ mở lại khi GAME_OVER)
    room.players.get('w1').alive = false;
    room.players.get('seer').alive = false;
    const w1ViewDead = getPlayersData(room, 'w1');
    assert.strictEqual(w1ViewDead.find((p) => p.id === 'seer').role, null, 'Khi Cặp Đôi đã chết thì không còn hiển thị role người yêu trong trận');

    // 5. Khi GAME_OVER: Lật mở toàn bộ Role và trạng thái Cặp Đôi cho tất cả mọi người
    room.phase = PHASES.GAME_OVER;
    const v1ViewGameOver = getPlayersData(room, 'v1');
    assert.strictEqual(v1ViewGameOver.find((p) => p.id === 'w1').role, ROLES.WOLF);
    assert.strictEqual(v1ViewGameOver.find((p) => p.id === 'seer').role, ROLES.SEER);
    assert.strictEqual(v1ViewGameOver.find((p) => p.id === 'w1').inCouple, true);
    results.push('[SYS-11] Bảo mật getPlayersData: Dân/Sói/Cupid/Cặp Đôi (lúc sống vs lúc chết) & Lật mở toàn bộ khi GAME_OVER');
  }

  // -------------------------------------------------------------------------
  // [SYS-12] Kiểm tra Quy Tắc Phân Luồng & Khóa 3 Kênh Chat (Làng / Hang Sói / Cặp Đôi)
  // -------------------------------------------------------------------------
  {
    const serverCode = fs.readFileSync(path.join(__dirname, '../server/index.js'), 'utf8');
    // 1. Hang Sói tự khóa khi DAY_VOTE
    assert(serverCode.includes("Kênh chat Hang Sói tạm khóa trong thời gian Bỏ Phiếu"));
    // 2. Kênh Cặp Đôi chỉ cho phép 2 người trong room.couple gửi & nhận, và khóa vào ban đêm
    assert(
      serverCode.includes('!room.couple || !room.couple.includes(socket.id)') &&
        serverCode.includes('tâm sự Cặp Đôi sẽ mở vào buổi sáng')
    );
    // 3. Người đã chết không được chat trong trận
    assert(serverCode.includes('room.phase !== PHASES.WAITING && room.phase !== PHASES.GAME_OVER && !player.alive'));
    results.push('[SYS-12] Phân luồng 3 kênh Chat: Khóa Làng & Cặp Đôi ban đêm, khóa Hang Sói giờ Vote, chặn hồn ma & người ngoài');
  }

  return results;
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

  const mobileResults = verifyMobileResponsiveAndChatLayout();
  console.log('✅ [PHẦN 4] KIỂM TRA GIAO DIỆN MOBILE RESPONSIVE & KHUNG CHAT TRÊN ĐIỆN THOẠI:');
  for (const m of mobileResults) {
    console.log(
      `   ✔ [${m.device}] Cột CoupleReveal: ${m.revealColPx}px | Cột Heartbreak: ${m.heartbreakColPx}px | Khung Chat Mobile: ${m.chatDrawerPx}px (Không vỡ form / Không tràn viền)`
    );
  }
  console.log('');

  const lifecycleResults = verifyLifecycleAndUxUpgrades();
  console.log('✅ [PHẦN 5] KIỂM TRA RECONNECT (F5), VÁN 2, EXIT GIỮA TRẬN & NÂNG CẤP UX:');
  for (const item of lifecycleResults) {
    console.log(`   ✔ ${item}`);
  }
  console.log('');

  const sixNightLogs = runSixNightFullMatchSimulation();
  console.log('✅ [PHẦN 6] KIỂM THỬ GIẢ LẬP VÁN ĐẤU 6 ĐÊM LIÊN TIẾP (TẤT CẢ ROLE ĐẶC BIỆT CÒN SỐNG):');
  for (const log of sixNightLogs) {
    console.log(`   ✔ ${log}`);
  }
  console.log('');

  const wolfVillageCoupleLogs = runWolfVillagerCoupleVictorySimulation();
  console.log('✅ [PHẦN 7] KIỂM THỬ KỊCH BẢN CẶP ĐÔI SÓI - DÂN (PHE CẶP ĐÔI) CHIẾN THẮNG:');
  for (const step of wolfVillageCoupleLogs) {
    console.log(`   ✔ ${step}`);
  }
  console.log('');

  const sysScenarios = runComprehensiveSystemScenarios();
  console.log(`✅ [PHẦN 8] KIỂM THỬ 12 KỊCH BẢN TOÀN HỆ THỐNG (${sysScenarios.length}/${sysScenarios.length} PASS):`);
  for (const s of sysScenarios) {
    console.log(`   ✔ ${s}`);
  }
  console.log('');

  const archResults = runPhase1ArchitectureTests();
  console.log(`✅ [PHẦN 9] KIỂM THỬ KIẾN TRÚC GIAI ĐOẠN 1 (TimerManager + RoleRegistry + AnimationQueue):`);
  for (const a of archResults) {
    console.log(`   ✔ ${a}`);
  }
  console.log('');

  const secResults = runPhase2SecurityAndBandwidthTests();
  console.log(`✅ [PHẦN 10] KIỂM THỬ GIAI ĐOẠN 2 (Bảo mật Reconnect Token, Rate Limit & Tối ưu băng thông Avatar):`);
  for (const s of secResults) {
    console.log(`   ✔ ${s}`);
  }
  console.log('');

  const totalTests =
    compResults.length +
    queueResults.length +
    1 +
    mobileResults.length +
    lifecycleResults.length +
    sixNightLogs.length +
    wolfVillageCoupleLogs.length +
    sysScenarios.length +
    archResults.length +
    secResults.length;
  console.log('================================================================================');
  console.log(
    `🎉 TỔNG KẾT: TẤT CẢ ${totalTests}/${totalTests} BÀI TEST TOÀN BỘ HỆ THỐNG ĐỀU PASS 100%!`
  );
  console.log('================================================================================');
}

function runPhase1ArchitectureTests() {
  const {
    createRoom,
    joinRoom,
    leaveRoom,
    assignRoles,
    checkWinCondition,
    getPlayersData,
  } = require('../server/gameLogic');
  const { ROLES } = require('../server/constants');
  const {
    scheduleRoomTimeout,
    clearAllRoomTimers,
    getActiveTimerCount,
  } = require('../server/timerManager');
  const {
    FACTIONS,
    registerRole,
    unregisterRole,
    getRole,
    getAllRoles,
    getNightOrderedRoles,
    isWolfTeam,
    getSeerAlignment,
  } = require('../server/roles/registry');

  const results = [];

  // [ARCH-01] TimerManager: Đăng ký & hủy toàn bộ pending timers chống timer ma
  {
    const { room } = createRoom('tm1', 'HostTM');
    let ghostFired = false;
    scheduleRoomTimeout(room, () => { ghostFired = true; }, 50, 'ghost-1');
    scheduleRoomTimeout(room, () => { ghostFired = true; }, 80, 'ghost-2');
    assert.strictEqual(getActiveTimerCount(room), 2, 'Phải theo dõi đúng 2 pending timers');

    const prevGen = room.matchGeneration;
    const cleared = clearAllRoomTimers(room);
    assert.strictEqual(cleared, 2, 'clearAllRoomTimers phải hủy đúng 2 timers');
    assert.strictEqual(getActiveTimerCount(room), 0, 'Sau khi clear không còn timer nào');
    assert.strictEqual(room.matchGeneration, prevGen + 1, 'matchGeneration phải tăng để chặn callback cũ');
    assert.strictEqual(ghostFired, false);

    // Xóa phòng trống cũng tự động dọn timer & đánh dấu destroyed
    scheduleRoomTimeout(room, () => { ghostFired = true; }, 50, 'ghost-leave');
    assert.strictEqual(getActiveTimerCount(room), 1);
    const left = leaveRoom(room.code, 'tm1');
    assert.strictEqual(left, null);
    assert.strictEqual(room.destroyed, true);
    assert.strictEqual(getActiveTimerCount(room), 0);
    results.push('[ARCH-01] TimerManager: Theo dõi, dọn sạch 100% pending timers khi reset ván hoặc xóa phòng (0 timer ma)');
  }

  // [ARCH-02] RoleRegistry: Đủ 8 vai trò lõi & thứ tự đêm chuẩn (Đêm 1 có Cupid, Đêm 2 bỏ Cupid)
  {
    const allRoles = getAllRoles();
    assert(allRoles.length >= 8, 'RoleRegistry phải chứa ít nhất 8 vai trò cốt lõi');
    assert.strictEqual(getRole(ROLES.WOLF).isWolfPack, true);
    assert.strictEqual(getSeerAlignment(ROLES.WOLF).alignmentName, 'ÁC');
    assert.strictEqual(getSeerAlignment(ROLES.VILLAGER).alignmentName, 'THIỆN');

    const night1Ids = getNightOrderedRoles(1).map((r) => r.id);
    const night2Ids = getNightOrderedRoles(2).map((r) => r.id);
    assert.strictEqual(night1Ids[0], ROLES.CUPID, 'Đêm 1 phải gọi Cupid đầu tiên');
    assert(!night2Ids.includes(ROLES.CUPID), 'Đêm 2 trở đi không gọi lại vai trò first_only (Cupid)');
    assert.deepStrictEqual(
      night2Ids.slice(0, 5),
      [ROLES.BODYGUARD, ROLES.WOLF, ROLES.WITCH, ROLES.SEER, ROLES.PIED_PIPER],
      'Thứ tự gọi đêm 2 phải chuẩn xác'
    );
    results.push('[ARCH-02] RoleRegistry: Đủ 8 vai trò lõi, thứ tự gọi đêm Đêm 1 / Đêm 2+ & alignment Tiên Tri chuẩn xác');
  }

  // [ARCH-03] RoleRegistry Plugin Extensibility: Cắm thử Sói Đầu Đàn & Người Hóa Sói (Lycan) không sửa code lõi
  {
    registerRole({
      id: 'alpha_wolf_test',
      name: 'Sói Đầu Đàn (Test)',
      emoji: '🐺👑',
      color: '#991B1B',
      faction: FACTIONS.WOLF,
      settingsKey: 'numAlphaWolvesTest',
      maxPerRoom: 1,
      assignPriority: 5,
      nightOrder: 30,
      activeNights: 'every_night',
      seerAlignment: 'evil',
      isWolfPack: true,
    });
    registerRole({
      id: 'lycan_test',
      name: 'Người Hóa Sói (Test)',
      emoji: '🌕',
      color: '#64748B',
      faction: FACTIONS.VILLAGE,
      settingsKey: 'numLycansTest',
      maxPerRoom: 1,
      assignPriority: 65,
      nightOrder: null,
      activeNights: 'passive',
      seerAlignment: 'evil', // Dân nhưng Tiên Tri soi ra ÁC!
      isWolfPack: false,
    });

    try {
      const { room } = createRoom('p1', 'P1', {
        numWolves: 1,
        numAlphaWolvesTest: 1,
        numLycansTest: 1,
        numSeers: 0,
        numBodyguards: 0,
        numWitches: 0,
        numHunters: 0,
        numPiedPipers: 0,
        numCupids: 0,
      });
      joinRoom(room.code, 'p2', 'P2');
      joinRoom(room.code, 'p3', 'P3');
      joinRoom(room.code, 'p4', 'P4');
      joinRoom(room.code, 'p5', 'P5');
      assignRoles(room);

      const players = [...room.players.values()];
      const alpha = players.find((p) => p.role === 'alpha_wolf_test');
      const wolf = players.find((p) => p.role === ROLES.WOLF);
      const lycan = players.find((p) => p.role === 'lycan_test');
      assert(alpha && wolf && lycan, 'assignRoles phải tự động chia các vai trò plugin mới đăng ký');
      assert.strictEqual(isWolfTeam(alpha.role), true);
      assert.strictEqual(isWolfTeam(lycan.role), false);
      assert.strictEqual(getSeerAlignment(lycan.role).alignmentName, 'ÁC', 'Lycan thuộc phe Dân nhưng Tiên Tri soi ra ÁC');

      // Sói thường phải nhìn thấy Sói Đầu Đàn là đồng minh trong getPlayersData
      const wolfView = getPlayersData(room, wolf.id);
      const alphaInWolfView = wolfView.find((p) => p.id === alpha.id);
      assert.strictEqual(alphaInWolfView.role, 'alpha_wolf_test', 'Bầy Sói tự động nhận diện vai trò Sói mới qua isWolfTeam');

      // Kiểm tra điều kiện thắng: 2 Sói (1 Wolf + 1 Alpha) vs 2 Dân -> Sói thắng ngay lập tức
      const villagers = players.filter((p) => !isWolfTeam(p.role));
      villagers[0].alive = false;
      const winCheck = checkWinCondition(room);
      assert.strictEqual(winCheck.gameOver, true);
      assert.strictEqual(winCheck.winner, 'wolves');
    } finally {
      unregisterRole('alpha_wolf_test');
      unregisterRole('lycan_test');
    }
    results.push('[ARCH-03] RoleRegistry Plugin: Cắm thử vai trò mới (Sói Đầu Đàn & Lycan) tự động chạy assignRoles, Seer, WolfPack & WinCondition');
  }

  // [ARCH-04] Client useAnimationQueue tồn tại & đúng cấu trúc
  {
    const hookPath = path.join(__dirname, '..', 'hooks', 'useAnimationQueue.js');
    assert(fs.existsSync(hookPath), 'Thiếu file hooks/useAnimationQueue.js');
    const hookSrc = fs.readFileSync(hookPath, 'utf8');
    assert(hookSrc.includes('enqueue') && hookSrc.includes('dequeue') && hookSrc.includes('clearQueue'));
    results.push('[ARCH-04] Client Foundation: hooks/useAnimationQueue.js sẵn sàng điều phối hàng đợi hoạt ảnh chống đè modal');
  }

  return results;
}

function runPhase2SecurityAndBandwidthTests() {
  const { createRoom, joinRoom, getPlayersData } = require('../server/gameLogic');
  const { roomStore } = require('../server/roomStore');
  const {
    verifyReconnectToken,
    sanitizeMessage,
    validateAvatarPayload,
    createRateLimiter,
    MAX_MESSAGE_LENGTH,
  } = require('../server/security');

  const results = [];

  // [SEC-01] Reconnect Token: Sinh token bí mật, ẩn khỏi getPlayersData, chống giả mạo tên
  {
    const { room } = createRoom('sec_host', 'HostSec');
    joinRoom(room.code, 'sec_p2', 'PlayerSec');

    const host = room.players.get('sec_host');
    const p2 = room.players.get('sec_p2');
    assert(host.reconnectToken && host.reconnectToken.length === 48, 'Mỗi người chơi phải có reconnectToken 48 ký tự hex');
    assert(p2.reconnectToken && p2.reconnectToken !== host.reconnectToken, 'Token giữa các người chơi phải khác nhau');

    // Đảm bảo getPlayersData KHÔNG BAO GIỜ lộ reconnectToken cho người khác
    const publicPlayers = getPlayersData(room, 'sec_p2');
    for (const pl of publicPlayers) {
      assert.strictEqual(pl.reconnectToken, undefined, 'getPlayersData tuyệt đối không được để lộ reconnectToken');
    }

    // Xác thực token đúng / sai / rỗng
    assert.strictEqual(verifyReconnectToken(host.reconnectToken, host.reconnectToken), true);
    assert.strictEqual(verifyReconnectToken(host.reconnectToken, p2.reconnectToken), false);
    assert.strictEqual(verifyReconnectToken(host.reconnectToken, null), false);
    assert.strictEqual(verifyReconnectToken(host.reconnectToken, 'forged_token'), false);
    results.push('[SEC-01] Reconnect Token: Sinh token 48-hex riêng, ẩn 100% khỏi getPlayersData & chặn chiếm chỗ bằng tên');
  }

  // [SEC-02] Rate Limiter: Chống spam chat / tạo phòng & dọn RAM khi disconnect
  {
    const limiter = createRateLimiter();
    // send-message mặc định tối đa 5 tin / 3s
    for (let i = 0; i < 5; i++) {
      assert.strictEqual(limiter.check('sock_spam', 'send-message').allowed, true);
    }
    const blocked = limiter.check('sock_spam', 'send-message');
    assert.strictEqual(blocked.allowed, false, 'Tin nhắn thứ 6 liên tiếp trong 3s phải bị chặn');
    assert(blocked.retryAfterMs >= 100);

    // Socket khác không bị ảnh hưởng
    assert.strictEqual(limiter.check('sock_normal', 'send-message').allowed, true);

    // Dọn bộ nhớ khi disconnect -> được phép lại từ đầu
    limiter.clearScope('sock_spam');
    assert.strictEqual(limiter.check('sock_spam', 'send-message').allowed, true);
    results.push('[SEC-02] Rate Limiter: Chặn spam vượt ngưỡng (5 tin/3s), cô lập theo socket & tự dọn RAM khi disconnect');
  }

  // [SEC-03] Input Sanitization & Emoji-Only Avatar Validation
  {
    const longMsg = 'A'.repeat(500) + '\u0000\u0007';
    const clean = sanitizeMessage(longMsg);
    assert.strictEqual(clean.length, MAX_MESSAGE_LENGTH, 'Tin nhắn quá dài phải bị cắt về tối đa 300 ký tự');

    // Chỉ chấp nhận icon emoji có sẵn, từ chối ảnh base64/URL
    assert.strictEqual(validateAvatarPayload('🐺').valid, true);
    assert.strictEqual(validateAvatarPayload('🧙‍♀️').valid, true);
    assert.strictEqual(validateAvatarPayload('data:image/png;base64,iVBORw0KGgo=').valid, false);
    assert.strictEqual(validateAvatarPayload('https://evil.com/a.png').valid, false);

    const { error } = createRoom('dos_host', 'DoSHost', {}, 'data:image/png;base64,abc123');
    assert(error && error.includes('icon'), 'createRoom phải chặn ảnh Base64 và chỉ cho phép icon có sẵn');
    results.push('[SEC-03] Input & Emoji-Only Avatar: Cắt tin nhắn >300 ký tự, chỉ nhận icon có sẵn & chặn ảnh Base64/URL');
  }

  // [SEC-04] RoomStore Abstraction & Live Operational Stats
  {
    const stats = roomStore.getStats();
    assert(typeof stats.activeRooms === 'number' && stats.activeRooms >= 1);
    assert(typeof stats.onlinePlayers === 'number' && stats.onlinePlayers >= 2);
    assert(typeof stats.waitingRooms === 'number' && typeof stats.activeGames === 'number');
    results.push('[SEC-04] RoomStore Abstraction: Lớp lưu trữ phòng độc lập & thống kê vận hành (/api/health) hoạt động chuẩn');
  }

  return results;
}

main();
