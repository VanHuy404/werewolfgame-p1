// ============================================
// 🐺 MA SÓI - App.js
// Ứng dụng gốc kết nối State, Socket.io và Navigation màn hình
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, StatusBar, SafeAreaView, Platform, TouchableOpacity, Modal, Animated,
} from 'react-native';
import { registerRootComponent } from 'expo';
import { createSocket } from './utils/socket';
import { COLORS } from './utils/colors';

import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import GameOverScreen from './screens/GameOverScreen';
import CardShuffleModal from './components/CardShuffleModal';
import { getSessionItem, setSessionItem, removeSessionItem, STORAGE_KEYS } from './utils/storage';

// Lớp bắt lỗi bảo vệ giao diện, ngăn crash sập WebSocket khi có lỗi component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('🚨 [ErrorBoundary Catch]:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>⚠️</Text>
          <Text style={{ color: '#F87171', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Đã xảy ra sự cố hiển thị giao diện!
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
            {this.state.error?.message || 'Lỗi không xác định'}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#6366F1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Thử tải lại giao diện</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  // Trạng thái màn hình: 'home' | 'lobby' | 'game'
  const [currentScreen, setCurrentScreen] = useState('home');

  // Trạng thái phòng & người chơi
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [settings, setSettings] = useState({ maxPlayers: 6, numWolves: 2, numSeers: 1 });
  const [hostId, setHostId] = useState('');
  const [myId, setMyId] = useState('');
  const [error, setError] = useState(null);

  // Trạng thái trận đấu
  const [myRole, setMyRole] = useState(null);
  const [phase, setPhase] = useState('night');
  const [round, setRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [deadPlayer, setDeadPlayer] = useState(null);
  const [savedPlayer, setSavedPlayer] = useState(null);
  const [poisonedPlayer, setPoisonedPlayer] = useState(null);
  const [witchSavedPlayer, setWitchSavedPlayer] = useState(null);
  const [shieldClashPlayer, setShieldClashPlayer] = useState(null);
  const [attackedPlayer, setAttackedPlayer] = useState(null);
  const [wasProtected, setWasProtected] = useState(false);
  const [lastProtectedTarget, setLastProtectedTarget] = useState(null);
  const [heartbrokenPlayer, setHeartbrokenPlayer] = useState(null);
  const [coupleSimultaneousNightDeath, setCoupleSimultaneousNightDeath] = useState(false);
  const [wolfVictim, setWolfVictim] = useState(null);
  const [witchState, setWitchState] = useState({ hasHeal: true, hasPoison: true });
  const [hunter, setHunter] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winMessage, setWinMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [seerHistory, setSeerHistory] = useState({});
  const [charmedHistory, setCharmedHistory] = useState({});
  const [couple, setCouple] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Hiệu ứng giọt máu nhỏ xuống cho hộp thoại xác nhận rời trận giữa chừng
  const bloodDrip1 = useRef(new Animated.Value(0)).current;
  const bloodDrip2 = useRef(new Animated.Value(0)).current;
  const bloodDrip3 = useRef(new Animated.Value(0)).current;

  const isLeavingMidGame = currentScreen === 'game' && phase !== 'game_over';

  useEffect(() => {
    if (!showLeaveConfirm || !isLeavingMidGame) return;

    const createDripLoop = (animVal, delay, duration) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animVal, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(animVal, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = createDripLoop(bloodDrip1, 0, 1700);
    const a2 = createDripLoop(bloodDrip2, 550, 2000);
    const a3 = createDripLoop(bloodDrip3, 1050, 1600);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
      bloodDrip1.setValue(0);
      bloodDrip2.setValue(0);
      bloodDrip3.setValue(0);
    };
  }, [showLeaveConfirm, isLeavingMidGame]);

  // Khởi tạo Socket.io một lần duy nhất
  useEffect(() => {
    const s = createSocket();
    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      setMyId(s.id);
      setError(null);

      // Tự động khôi phục phòng nếu người chơi F5 / tải lại trang
      const savedActiveRoom = getSessionItem(STORAGE_KEYS.ACTIVE_ROOM);
      const savedPlayerName = getSessionItem(STORAGE_KEYS.PLAYER_NAME);
      const savedAvatar = getSessionItem(STORAGE_KEYS.PLAYER_AVATAR);
      if (savedActiveRoom) {
        try {
          const parsed = JSON.parse(savedActiveRoom);
          if (parsed && parsed.roomCode) {
            s.emit('reconnect-room', {
              roomCode: parsed.roomCode,
              playerName: parsed.playerName || savedPlayerName || 'Dân Làng',
              oldPlayerId: parsed.playerId,
              customAvatar: parsed.customAvatar || savedAvatar,
              reconnectToken: parsed.reconnectToken,
            });
          }
        } catch (e) {
          console.warn('Lỗi đọc active room:', e);
        }
      }
    });

    // Tạo phòng thành công
    s.on('room-created', ({ roomCode, players, settings, hostId, reconnectToken }) => {
      setRoomCode(roomCode);
      setPlayers(players);
      setSettings(settings);
      setHostId(hostId);
      setCurrentScreen('lobby');
      setError(null);
      const myPlayer = players.find((p) => p.id === s.id);
      setSessionItem(STORAGE_KEYS.ACTIVE_ROOM, {
        roomCode,
        playerName: myPlayer?.name || getSessionItem(STORAGE_KEYS.PLAYER_NAME),
        customAvatar: myPlayer?.avatar || getSessionItem(STORAGE_KEYS.PLAYER_AVATAR),
        playerId: s.id,
        reconnectToken,
      });
    });

    // Vào phòng thành công
    s.on('room-joined', ({ roomCode, players, settings, hostId, reconnectToken }) => {
      setRoomCode(roomCode);
      setPlayers(players);
      setSettings(settings);
      setHostId(hostId);
      setCurrentScreen('lobby');
      setError(null);
      const myPlayer = players.find((p) => p.id === s.id);
      setSessionItem(STORAGE_KEYS.ACTIVE_ROOM, {
        roomCode,
        playerName: myPlayer?.name || getSessionItem(STORAGE_KEYS.PLAYER_NAME),
        customAvatar: myPlayer?.avatar || getSessionItem(STORAGE_KEYS.PLAYER_AVATAR),
        playerId: s.id,
        reconnectToken,
      });
    });

    // Khôi phục vào trận đấu khi tải lại trang
    s.on('reconnected-in-game', (data) => {
      setRoomCode(data.roomCode);
      setPlayers(data.players);
      setSettings(data.settings);
      setHostId(data.hostId);
      setMyRole(data.role);
      setPhase(data.phase);
      setRound(data.round || 1);
      setTimeLeft(data.timeLeft || 0);
      setDeadPlayer(data.deadPlayer || null);
      setPoisonedPlayer(data.poisonedPlayer || null);
      setShieldClashPlayer(data.shieldClashPlayer || null);
      setWitchSavedPlayer(data.witchSavedPlayer || null);
      setSavedPlayer(data.savedPlayer || null);
      setWasProtected(Boolean(data.wasProtected));
      setLastProtectedTarget(data.lastProtectedTarget || null);
      if (data.witchState) setWitchState(data.witchState);
      if (data.hunter !== undefined) setHunter(data.hunter);
      setSeerHistory(data.seerHistory || {});
      setCharmedHistory(data.charmedHistory || {});
      setCouple(data.couple || []);
      setMatchHistory(data.matchHistory || []);
      setCurrentScreen('game');
      setError(null);
      // Cập nhật lại session storage với socket.id mới nhất
      setSessionItem(STORAGE_KEYS.ACTIVE_ROOM, {
        roomCode: data.roomCode,
        playerName: getSessionItem(STORAGE_KEYS.PLAYER_NAME),
        customAvatar: getSessionItem(STORAGE_KEYS.PLAYER_AVATAR),
        playerId: s.id,
        reconnectToken: data.reconnectToken,
      });
    });

    // Khôi phục thất bại (phòng đã hủy)
    s.on('reconnect-failed', () => {
      removeSessionItem(STORAGE_KEYS.ACTIVE_ROOM);
    });

    // Bị chủ phòng xóa khỏi phòng
    s.on('kicked-from-room', ({ message }) => {
      removeSessionItem(STORAGE_KEYS.ACTIVE_ROOM);
      resetGameState();
      setError(message || 'Bạn đã bị chủ phòng mời ra khỏi phòng!');
    });

    // Có người chơi mới vào phòng
    s.on('player-joined', ({ players, newPlayerName }) => {
      setPlayers(players);
    });

    // Có người chơi rời phòng
    s.on('player-left', ({ players, hostId }) => {
      if (players) setPlayers(players);
      if (hostId) setHostId(hostId);
    });

    // Người chơi mất kết nối tạm thời trong trận
    s.on('player-disconnected', ({ playerId, playerName }) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, connected: false, alive: false } : p))
      );
    });

    // Cập nhật danh sách người chơi (VD: có người out game giữa trận hoặc đổi chủ phòng)
    s.on('players-update', ({ players, hostId }) => {
      if (players) setPlayers(players);
      if (hostId) setHostId(hostId);
    });

    // Cài đặt phòng được cập nhật
    s.on('settings-updated', ({ settings }) => {
      setSettings(settings);
    });

    // Bắt đầu game - nhận vai trò
    s.on('game-started', ({ role, players }) => {
      setMyRole(role);
      setPlayers(players);
      setMessages([]);
      setPhase('night');
      setRound(1);
      setDeadPlayer(null);
      setSavedPlayer(null);
      setPoisonedPlayer(null);
      setShieldClashPlayer(null);
      setWitchSavedPlayer(null);
      setAttackedPlayer(null);
      setHeartbrokenPlayer(null);
      setCoupleSimultaneousNightDeath(false);
      setWasProtected(false);
      setLastProtectedTarget(null);
      setWolfVictim(null);
      setWitchState({ hasHeal: true, hasPoison: true });
      setHunter(null);
      setWinner(null);
      setWinMessage('');
      setSeerHistory({});
      setCharmedHistory({});
      setCouple([]);
      setMatchHistory([]);
      setShowRoleReveal(true);
      setCurrentScreen('game');
    });

    // Chuyển pha game
    s.on('phase-change', (data) => {
      setPhase(data.phase);
      if (data.round !== undefined) setRound(data.round);
      if (data.deadPlayer !== undefined) setDeadPlayer(data.deadPlayer);
      if (data.savedPlayer !== undefined) setSavedPlayer(data.savedPlayer);
      if (data.poisonedPlayer !== undefined) setPoisonedPlayer(data.poisonedPlayer);
      if (data.shieldClashPlayer !== undefined) setShieldClashPlayer(data.shieldClashPlayer);
      if (data.witchSavedPlayer !== undefined) setWitchSavedPlayer(data.witchSavedPlayer);
      if (data.attackedPlayer !== undefined) setAttackedPlayer(data.attackedPlayer);
      if (data.heartbrokenPlayer !== undefined) setHeartbrokenPlayer(data.heartbrokenPlayer);
      else if (data.phase !== 'day_announce') setHeartbrokenPlayer(null);
      if (data.coupleSimultaneousNightDeath !== undefined) setCoupleSimultaneousNightDeath(Boolean(data.coupleSimultaneousNightDeath));
      else if (data.phase !== 'day_announce') setCoupleSimultaneousNightDeath(false);
      if (data.wasProtected !== undefined) setWasProtected(data.wasProtected);
      if (data.lastProtectedTarget !== undefined) setLastProtectedTarget(data.lastProtectedTarget);
      if (data.wolfVictim !== undefined) setWolfVictim(data.wolfVictim);
      else if (data.phase !== 'night_witch') setWolfVictim(null);
      if (data.witchState !== undefined) setWitchState(data.witchState);
      if (data.hunter !== undefined) setHunter(data.hunter);
      if (data.charmedHistory !== undefined) setCharmedHistory(data.charmedHistory);
      if (data.couple !== undefined) setCouple(data.couple);
      if (data.matchHistory !== undefined) setMatchHistory(data.matchHistory);
      if (data.players) setPlayers(data.players);
      if (data.winner) setWinner(data.winner);
      if (data.message) setWinMessage(data.message);
    });

    // Cặp đôi được thần Cupid kết nối
    s.on('couple-formed', ({ couple }) => {
      if (couple) setCouple(couple);
    });

    // Đếm ngược thời gian
    s.on('timer-update', ({ timeLeft }) => {
      setTimeLeft(timeLeft);
    });

    // Tin nhắn chat mới
    s.on('new-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Thông báo lỗi
    s.on('error-msg', ({ message }) => {
      setError(message);
      setTimeout(() => setError(null), 5000);
    });

    // Rời phòng về home
    s.on('left-room', () => {
      resetGameState();
    });

    // Trở về phòng chờ sau khi kết thúc game
    s.on('returned-to-lobby', ({ roomCode, players, settings, hostId }) => {
      setRoomCode(roomCode);
      setPlayers(players);
      setSettings(settings);
      setHostId(hostId);
      setMyRole(null);
      setPhase('waiting');
      setDeadPlayer(null);
      setSavedPlayer(null);
      setPoisonedPlayer(null);
      setShieldClashPlayer(null);
      setWitchSavedPlayer(null);
      setAttackedPlayer(null);
      setHeartbrokenPlayer(null);
      setCoupleSimultaneousNightDeath(false);
      setWasProtected(false);
      setLastProtectedTarget(null);
      setWolfVictim(null);
      setWitchState({ hasHeal: true, hasPoison: true });
      setHunter(null);
      setWinner(null);
      setWinMessage('');
      setMessages([]);
      setSeerHistory({});
      setCharmedHistory({});
      setCouple([]);
      setMatchHistory([]);
      setShowRoleReveal(false);
      setCurrentScreen('lobby');
      setError(null);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Reset về màn hình chính
  const resetGameState = () => {
    removeSessionItem(STORAGE_KEYS.ACTIVE_ROOM);
    setCurrentScreen('home');
    setRoomCode('');
    setPlayers([]);
    setMyRole(null);
    setDeadPlayer(null);
    setSavedPlayer(null);
    setPoisonedPlayer(null);
    setShieldClashPlayer(null);
    setWitchSavedPlayer(null);
    setAttackedPlayer(null);
    setHeartbrokenPlayer(null);
    setCoupleSimultaneousNightDeath(false);
    setWasProtected(false);
    setLastProtectedTarget(null);
    setWolfVictim(null);
    setWitchState({ hasHeal: true, hasPoison: true });
    setHunter(null);
    setWinner(null);
    setWinMessage('');
    setMessages([]);
    setSeerHistory({});
    setCharmedHistory({});
    setCouple([]);
    setMatchHistory([]);
    setError(null);
  };

  // Mở hộp thoại xác nhận trước khi rời phòng
  const handleLeaveRoom = () => {
    setShowLeaveConfirm(true);
  };

  // Thực thi rời phòng sau khi người chơi xác nhận
  const confirmLeaveRoom = () => {
    setShowLeaveConfirm(false);
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
    }
    resetGameState();
  };

  // Trở về phòng chờ khi kết thúc game
  const handleReturnToLobby = () => {
    if (socketRef.current) {
      socketRef.current.emit('return-to-lobby');
    }
  };

  // Gửi tin nhắn chat (hỗ trợ kênh riêng của Sói & Cặp Đôi)
  const handleSendMessage = (message, isWolfChat = false, isCoupleChat = false) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', { message, isWolfChat, isCoupleChat });
    }
  };

  const isNightTheme = currentScreen === 'game' && (phase === 'night' || phase === 'night_wolf' || phase === 'night_seer' || phase === 'night_bodyguard' || phase === 'night_witch');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isNightTheme ? 'light-content' : 'dark-content'}
        backgroundColor={isNightTheme ? COLORS.nightBg : COLORS.dayBg}
      />

      {/* Màn hình chính (Home) */}
      {currentScreen === 'home' && (
        <HomeScreen
          socket={socket}
          error={error}
        />
      )}

      {/* Màn hình phòng chờ (Lobby) */}
      {currentScreen === 'lobby' && (
        <LobbyScreen
          socket={socket}
          roomCode={roomCode}
          players={players}
          settings={settings}
          hostId={hostId}
          myId={myId}
          error={error}
          onLeave={handleLeaveRoom}
        />
      )}

      {/* Màn hình kết thúc trận (Trang riêng biệt, không thao tác vào game) */}
      {currentScreen === 'game' && phase === 'game_over' && (
        <GameOverScreen
          socket={socket}
          roomCode={roomCode}
          players={players}
          winner={winner}
          winMessage={winMessage}
          myRole={myRole}
          myId={myId}
          hostId={hostId}
          couple={couple}
          matchHistory={matchHistory}
          onReturnToLobby={handleReturnToLobby}
          onLeaveGame={handleLeaveRoom}
        />
      )}

      {/* Màn hình trong trận (Game) */}
      {currentScreen === 'game' && phase !== 'game_over' && (
        <ErrorBoundary>
          <GameScreen
            socket={socket}
            roomCode={roomCode}
            players={players}
            myRole={myRole}
            phase={phase}
            round={round}
            timeLeft={timeLeft}
            deadPlayer={deadPlayer}
            savedPlayer={savedPlayer}
            poisonedPlayer={poisonedPlayer}
            shieldClashPlayer={shieldClashPlayer}
            witchSavedPlayer={witchSavedPlayer}
            attackedPlayer={attackedPlayer}
            heartbrokenPlayer={heartbrokenPlayer}
            coupleSimultaneousNightDeath={coupleSimultaneousNightDeath}
            wasProtected={wasProtected}
            lastProtectedTarget={lastProtectedTarget}
            wolfVictim={wolfVictim}
            initialWitchState={witchState}
            hunter={hunter}
            winner={winner}
            winMessage={winMessage}
            messages={messages}
            onSendMessage={handleSendMessage}
            onReturnToLobby={handleReturnToLobby}
            onLeaveGame={handleLeaveRoom}
            myId={myId}
            hostId={hostId}
            initialSeerHistory={seerHistory}
            initialCharmedHistory={charmedHistory}
            couple={couple}
          />
        </ErrorBoundary>
      )}

      {/* Hiệu ứng xào bài và lật mở vai trò khi vừa vào trận */}
      <CardShuffleModal
        visible={showRoleReveal}
        initialRole={myRole}
        isMatchIntro={true}
        autoCloseSeconds={6}
        onClose={() => setShowRoleReveal(false)}
      />

      {/* Hộp thoại xác nhận trước khi rời phòng (chống bấm nhầm giữa trận / phòng chờ) */}
      <Modal
        visible={showLeaveConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmBox, isLeavingMidGame && styles.confirmBoxMidGame]}>
            {isLeavingMidGame ? (
              <View style={styles.bloodTitleWrap}>
                <Text style={styles.bloodWarningText}>
                  BẠN CÓ CHẮC CHẮN MUỐN RỜI KHỎI CUỘC CHƠI KHỐC LIỆT NÀY
                </Text>
                {/* Hiệu ứng các giọt máu đỏ chảy xuống dưới dòng chữ */}
                <View style={styles.bloodDripsLayer} pointerEvents="none">
                  {[
                    { anim: bloodDrip1, left: '18%', height: 14, width: 5 },
                    { anim: bloodDrip2, left: '52%', height: 18, width: 6 },
                    { anim: bloodDrip3, left: '80%', height: 12, width: 4.5 },
                  ].map((drop, idx) => (
                    <Animated.View
                      key={idx}
                      style={[
                        styles.bloodDrop,
                        {
                          left: drop.left,
                          width: drop.width,
                          height: drop.height,
                          opacity: drop.anim.interpolate({
                            inputRange: [0, 0.15, 0.85, 1],
                            outputRange: [0.35, 0.95, 0.85, 0],
                          }),
                          transform: [
                            {
                              translateY: drop.anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 22],
                              }),
                            },
                            {
                              scaleY: drop.anim.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [0.6, 1.35, 0.9],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.confirmEmoji}>🚪</Text>
                <Text style={styles.confirmTitle}>Xác nhận rời phòng?</Text>
                <Text style={styles.confirmDesc}>
                  {`Bạn có chắc chắn muốn rời khỏi phòng ${roomCode || ''} không?`}
                </Text>
              </>
            )}

            <View style={styles.confirmBtnFrame}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowLeaveConfirm(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelText}>
                  {isLeavingMidGame ? 'Ở lại' : 'Hủy'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDangerBtn}
                onPress={confirmLeaveRoom}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmDangerText}>
                  {isLeavingMidGame ? '🚪 Rời trận' : 'Rời phòng'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: COLORS.dayBg,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#090D16',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 12,
  },
  confirmBoxMidGame: {
    backgroundColor: '#07090F',
    borderColor: '#450A0A',
    shadowColor: '#991B1B',
    shadowOpacity: 0.45,
  },
  bloodTitleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 26,
    position: 'relative',
  },
  bloodWarningText: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '900',
    color: '#DC2626',
    textAlign: 'center',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(127, 29, 29, 0.95)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  bloodDripsLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    height: 24,
  },
  bloodDrop: {
    position: 'absolute',
    top: 0,
    backgroundColor: '#B91C1C',
    borderBottomLeftRadius: 99,
    borderBottomRightRadius: 99,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  confirmEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 18,
  },
  confirmBtnFrame: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#05070D',
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
  },
  confirmCancelText: {
    color: '#E2E8F0',
    fontWeight: '800',
    fontSize: 14,
  },
  confirmDangerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1C0A0D',
    borderWidth: 1.5,
    borderColor: '#7F1D1D',
    alignItems: 'center',
  },
  confirmDangerText: {
    color: '#FCA5A5',
    fontWeight: '900',
    fontSize: 14,
  },
});

registerRootComponent(App);
