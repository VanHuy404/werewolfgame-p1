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
      setPlayers(players);
      if (hostId) setHostId(hostId);
    });

    // Người chơi mất kết nối tạm thời trong trận
    s.on('player-disconnected', ({ playerId, playerName }) => {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, connected: false } : p))
      );
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

  // Gửi tin nhắn chat
  const handleSendMessage = (message) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', { message });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={currentScreen === 'game' && phase === 'night' ? 'light-content' : 'dark-content'}
        backgroundColor={currentScreen === 'game' && phase === 'night' ? COLORS.nightBg : COLORS.dayBg}
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

      {/* Màn hình trong trận (Game) */}
      {currentScreen === 'game' && (
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
