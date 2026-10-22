// ============================================
// 🐺 MA SÓI - App.js
// Ứng dụng gốc kết nối State, Socket.io và Navigation màn hình
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, StatusBar, SafeAreaView, Platform,
} from 'react-native';
import { registerRootComponent } from 'expo';
import { createSocket } from './utils/socket';
import { COLORS } from './utils/colors';

import HomeScreen from './screens/HomeScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import GameOverScreen from './screens/GameOverScreen';
import RoleCard from './components/RoleCard';

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
  const [winner, setWinner] = useState(null);
  const [winMessage, setWinMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showRoleReveal, setShowRoleReveal] = useState(false);

  // Khởi tạo Socket.io một lần duy nhất
  useEffect(() => {
    const s = createSocket();
    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      setMyId(s.id);
      setError(null);
    });

    // Tạo phòng thành công
    s.on('room-created', ({ roomCode, players, settings, hostId }) => {
      setRoomCode(roomCode);
      setPlayers(players);
      setSettings(settings);
      setHostId(hostId);
      setCurrentScreen('lobby');
      setError(null);
    });

    // Vào phòng thành công
    s.on('room-joined', ({ roomCode, players, settings, hostId }) => {
      setRoomCode(roomCode);
      setPlayers(players);
      setSettings(settings);
      setHostId(hostId);
      setCurrentScreen('lobby');
      setError(null);
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
      setWinner(null);
      setWinMessage('');
      setMessages([]);
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
    setCurrentScreen('home');
    setRoomCode('');
    setPlayers([]);
    setMyRole(null);
    setDeadPlayer(null);
    setWinner(null);
    setWinMessage('');
    setMessages([]);
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

  const isNightTheme = currentScreen === 'game' && (phase === 'night' || phase === 'night_wolf' || phase === 'night_seer');

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
        <GameScreen
          socket={socket}
          roomCode={roomCode}
          players={players}
          myRole={myRole}
          phase={phase}
          round={round}
          timeLeft={timeLeft}
          deadPlayer={deadPlayer}
          winner={winner}
          winMessage={winMessage}
          messages={messages}
          onSendMessage={handleSendMessage}
          onReturnToLobby={handleReturnToLobby}
          onLeaveGame={handleLeaveRoom}
          myId={myId}
        />
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
