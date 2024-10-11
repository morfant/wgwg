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
      messages: [], // 계속 누적되는 대화 기록
      isFetching: false,
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
    sendMessage() {
      console.log("sendMessage()");

      // 메시지 전송 로직
      if (this.userInput.trim() === "") return;
      this.messages.push({
        sender: "User",
        text: this.userInput,
        agentType: "User",
      });
      this.isFetching = true; // 메시지 전송 시 로딩 상태 설정
      this.socket.send(JSON.stringify({ message: this.userInput}));
      this.userInput = "";
      this.updateScroll(); // 메시지 전송 후 스크롤
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
    // Vue 인스턴스를 전역 객체에 노출
    // 브라우저 콘솔에서 app.isConnected 등으로 접근이 가능해짐
    window.app = this;

    // 컴포넌트가 마운트될 때 웹소켓 연결 설정
    this.socket = new WebSocket('ws://localhost:4001/ws/chat');

    this.socket.onopen = () => {
      console.log("WebSocket connection opened");
      this.isConnected = true; // 연결 성공 시 입력 활성화

      // heart beat
      // 30초마다 ping 메시지 전송
      this.pingInterval = setInterval(() => {
        if (this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ heartbeat : "ping" }));
            console.log("ping");
        }
      }, 30000); // 30초
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data.response);

      const { agentType, response } = data;
      console.log("agentType: ", agentType)
      console.log(this.messages)
      if (data.response === "[END]") {
        this.isFetching = false;
      } else {
        if (
          this.messages.length > 0 &&
          this.messages[this.messages.length - 1].sender === "Bot" &&
          this.messages[this.messages.length - 1].agentType === agentType
        ) {
          // msg block에 내용 업데이트
          console.log("Updating...")
          const lastMessage = this.messages[this.messages.length - 1];
          lastMessage.text = response;
        } else {
          // msg block 새로 만듦
          console.log("New block...")
          this.messages.push({ sender: "Bot", text: response, agentType: agentType });
        }
        this.updateScroll(); // 메시지가 추가될 때마다 스크롤
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket 오류:', error);
      this.isConnected = false; // 연결 종료 시 입력 비활성화
      this.isFetching = false;
      // ping 메시지 전송 중지
      clearInterval(this.pingInterval);
    };

    this.socket.onclose = () => {
      console.log('WebSocket 연결 종료');
      this.isConnected = false; // 연결 종료 시 입력 비활성화
      this.isFetching = false;
      // ping 메시지 전송 중지
      clearInterval(this.pingInterval);
    };
  },
};
</script>

<style src="./App.css"></style>