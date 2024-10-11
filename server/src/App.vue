<template>
  <div id="app" class="app-container">
    <!-- 왼쪽 텍스트 영역 -->
    <div class="chat-section">
      <h1>{{ activeMenu }}</h1>
      <div class="chat-box">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.agentType]" >
          <div v-html="renderMessage(message.text)"></div>
          <button v-if="isReportEnd" @click="downloadPDF(index)" class="pdf-button">
            Download PDF
          </button>
        </div>
        <div v-if="isFetching" class="loading-indicator">응답을 받아오는 중입니다...</div>
      </div>
      <div class="input-container">
        <input
          v-model="userInput"
          @keyup.enter="handleButtonClick"
          placeholder="Type a message..."
          class="input-box"
          :disabled="isFetching || !isConnected"
        />
        <button 
          @click="handleButtonClick" 
          class="send-button"
          :disabled="isFetching || !isConnected"
        >
          {{ isFetching ? "......" : "Send" }}
        </button>
      </div>
    </div>
    
    <!-- 오른쪽 영역: 토글 버튼 및 슬라이더 -->
    <div class="control-section">
      <h2>Control Panel</h2>

      <!-- 토글 버튼들 -->
      <div class="button-container">
        <h3>Toggle Buttons</h3>
        <button
          v-for="(btn, index) in buttons"
          :key="index"
          :class="['toggle-btn', { active: btn.active }]"
          @click="toggleButton(index)"
        >
          {{ index + 1 }}
        </button>
      </div>

      <!-- 슬라이더들 -->
      <div class="slider-container">
        <h3>Sliders</h3>
        <vue-slider
          v-for="(knob, index) in knobs"
          :key="index"
          v-model="knob.value"
          :min="0"
          :max="100"
          @change="handleSliderChange(index, knob.value)"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { marked } from "marked";
import VueSlider from 'vue-slider-component'; // 슬라이더 컴포넌트 가져오기
import 'vue-slider-component/theme/default.css'; // 테마 스타일 추가

export default {
  components: {
    VueSlider, // 슬라이더 컴포넌트 등록
  },
  data() {
    return {
      userInput: "",
      messages: [],
      isFetching: false,
      isReportEnd: false,
      isConnected: false,
      socket: null,
      activeMenu: "WGWG - Agent들의 놀이터", // 기본 메뉴 제목
      buttons: [
        { active: false }, { active: false }, { active: false },
        { active: false }, { active: false }, { active: false }
      ], // 토글 버튼 6개
      knobs: [
        { value: 50 }, { value: 50 }, { value: 50 },
        { value: 50 }, { value: 50 }, { value: 50 }
      ], // 슬라이더 6개
    };

  },
  methods: {
    toggleButton(index) {
      this.buttons[index].active = !this.buttons[index].active;
      var state = this.buttons[index].active;
      console.log(`Button ${index + 1} toggled: ${this.buttons[index].active}`);

      // 버튼에 대한 동작 정의
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "Button", index: index + 1, value: state }));
      }
    },
    handleSliderChange(index, val) {
      console.log(`Slider ${index + 1} changed to ${val}`);
      // 슬라이더 값 변경에 대한 동작 정의
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "Slider", index: index + 1, value: val}));
      }
    },
    handleButtonClick() {
      if (!this.isFetching) {
        this.sendMessage();
      }
    },
    connectWebSocket() {
      console.log("connectWebSocket()");
      // WebSocket 연결 설정
    },
    sendMessage() {
      console.log("sendMessage()");
      // 메시지 전송 로직
    },
    renderMessage(text) {
      return marked.parse(text);
    },
    updateScroll() {
      // 브라우저 창 전체를 스크롤하여 페이지의 맨 아래로 이동
      window.scrollTo(0, document.body.scrollHeight);
    },
  },
  mounted() {
    this.connectWebSocket();

    // 컴포넌트가 마운트될 때 웹소켓 연결 설정
    this.socket = new WebSocket('ws://localhost:4001/ws/chat');

    this.socket.onopen = () => {
      console.log('WebSocket 연결됨');
    };

    this.socket.onmessage = (event) => {
      console.log('메시지 수신:', event.data);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket 연결 종료');
    };
  },
};
</script>

<style src="./App.css"></style>