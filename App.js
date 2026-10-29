// ============================================
// 🐺 MA SÓI - App.js
// Ứng dụng gốc kết nối State, Socket.io và Navigation màn hình
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, StatusBar, SafeAreaView, Platform, TouchableOpacity,
} from 'react-native';
import { registerRootComponent } from 'expo';
import { createSocket } from './utils/socket';
import { COLORS } from './utils/colors';

import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import GameOverScreen from './screens/GameOverScreen';
import RoleCard from './components/RoleCard';
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
  const [wolfVictim, setWolfVictim] = useState(null);
  const [witchState, setWitchState] = useState({ hasHeal: true, hasPoison: true });
  const [hunter, setHunter] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winMessage, setWinMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showRoleReveal, setShowRoleReveal] = useState(false);
  const [seerHistory, setSeerHistory] = useState({});

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
            });
          }
        } catch (e) {
          console.warn('Lỗi đọc active room:', e);
        }
      }
    });

    // Tạo phòng thành công
    s.on('room-created', ({ roomCode, players, settings, hostId }) => {
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
      });
    });

    // Vào phòng thành công
    s.on('room-joined', ({ roomCode, players, settings, hostId }) => {
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
      setSavedPlayer(data.savedPlayer || null);
      setWasProtected(Boolean(data.wasProtected));
      setLastProtectedTarget(data.lastProtectedTarget || null);
      setSeerHistory(data.seerHistory || {});
      setCurrentScreen('game');
      setError(null);
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

    // Cập nhật danh sách người chơi (VD: có người out game giữa trận)
    s.on('players-update', ({ players }) => {
      if (players) setPlayers(players);
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
      setWasProtected(false);
      setLastProtectedTarget(null);
      setWolfVictim(null);
      setWitchState({ hasHeal: true, hasPoison: true });
      setWinner(null);
      setWinMessage('');
      setSeerHistory({});
      setShowRoleReveal(true);
      setCurrentScreen('game');

      // Tắt card reveal sau 4 giây
      setTimeout(() => {
        setShowRoleReveal(false);
      }, 4000);
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
      if (data.wasProtected !== undefined) setWasProtected(data.wasProtected);
      if (data.lastProtectedTarget !== undefined) setLastProtectedTarget(data.lastProtectedTarget);
      if (data.wolfVictim !== undefined) setWolfVictim(data.wolfVictim);
      if (data.witchState !== undefined) setWitchState(data.witchState);
      if (data.hunter !== undefined) setHunter(data.hunter);
      if (data.players) setPlayers(data.players);
      if (data.winner) setWinner(data.winner);
      if (data.message) setWinMessage(data.message);
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
      setWasProtected(false);
      setLastProtectedTarget(null);
      setWolfVictim(null);
      setWitchState({ hasHeal: true, hasPoison: true });
      setWinner(null);
      setWinMessage('');
      setMessages([]);
      setSeerHistory({});
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
    setWitchSavedPlayer(null);
    setAttackedPlayer(null);
    setWasProtected(false);
    setLastProtectedTarget(null);
    setWolfVictim(null);
    setWitchState({ hasHeal: true, hasPoison: true });
    setWinner(null);
    setWinMessage('');
    setMessages([]);
    setSeerHistory({});
    setError(null);
  };

  // Rời phòng
  const handleLeaveRoom = () => {
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

  // Gửi tin nhắn chat (hỗ trợ kênh riêng của Sói)
  const handleSendMessage = (message, isWolfChat = false) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', { message, isWolfChat });
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
          />
        </ErrorBoundary>
      )}

      {/* Thẻ hiển thị vai trò khi vừa vào trận */}
      <RoleCard
        role={myRole}
        visible={showRoleReveal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: Platform.OS === 'web' ? '100vh' : '100%',
    backgroundColor: COLORS.dayBg,
  },
});

registerRootComponent(App);
