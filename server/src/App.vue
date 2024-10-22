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

      <!-- 1번 그룹 -->
      <div class="group" v-for="n in 5" :key="n">
        <button 
          class="big-btn" 
          :class="{ active: isActive(n) }" 
          @click="selectGroup(n)">
          {{ n }}
        </button>
        <div class="button-row">
          <button 
            v-for="(btn, index) in 4" 
            :key="index" 
            :class="['toggle-btn', { active: isActiveButton(n, index) }]"
            @click="toggleButtonInGroup(n, index)">
            {{ index + 1 }}
          </button>
        </div>
        <vue-slider 
          v-model="tempo[n - 1]" 
          :min="0" 
          :max="100" 
          @change="handleSliderChange(`tempo${n}`, tempo[n - 1])" />
        <vue-slider 
          v-model="volume[n - 1]" 
          :min="0" 
          :max="100" 
          @change="handleSliderChange(`volume${n}`, volume[n - 1])" />
      </div>


      <!--
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

      <div class="slider-container">
        <h3>Tempo Sliders</h3>
        <vue-slider
          v-for="(knob, index) in knobs"
          :key="index"
          v-model="knob.value"
          :min="0"
          :max="100"
          @change="handleSliderChange(index, knob.value)"
        />
        <h3>Volume Sliders</h3>
        <vue-slider
          v-for="(knob, index) in vol_knobs"
          :key="index+5"
          v-model="knob.value"
          :min="0"
          :max="100"
          @change="handleSliderChange(index+5, knob.value)"
        />
      -->
 
      <div class="slider-container">
        <h3>Control Sliders</h3>
        <div v-for="(knob, index) in con_knobs" :key="index + 5 + 5" style="margin-bottom: 20px;">
        <label :for="'slider-' + (index + 5 + 5)">
          {{ knob.label }}
        </label>
        <vue-slider
          :id="'slider-' + (index + 5 + 5)"
          v-model="knob.value"
          :min="0"
          :max="100"
          @change="handleSliderChange(index + 5 + 5, knob.value)"
        />
      </div>

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
      activeMenu: "WGWG 와글와글", // 기본 메뉴 제목
      // knobs: [
      //   { value: 50 }, { value: 50 }, { value: 50 },
      //   { value: 50 }, { value: 50 }
      // ], // 슬라이더 5개

      // vol_knobs: [
      //   { value: 50 }, { value: 50 }, { value: 50 },
      //   { value: 50 }, { value: 50 }
      // ], // 슬라이더 5개

      con_knobs: [
        { value: 20, label: "Reverb" },
        // { value: 20, label: "Duration" },
      ], // 슬라이더 6개

      buttons: Array(20).fill(false).map((_, i) => i % 4 === 0),
      selectedGroup: 1, // 현재 선택된 그룹 (1 ~ 5)
      tempo: Array(5).fill(50), // 각 그룹별 tempo 값 초기화
      volume: Array(5).fill(50), // 각 그룹별 volume 값 초기화

    };
  },
  methods: {
      toggleButtonInGroup(group, index) {
      const start = (group - 1) * 4; // 그룹의 첫 번째 버튼 인덱스
      const end = start + 4;         // 그룹의 마지막 버튼 인덱스

      // 같은 그룹의 모든 버튼을 비활성화
      for (let i = start; i < end; i++) {
        this.buttons[i] = false;
      }

      // 클릭한 버튼만 활성화
      this.buttons[start + index] = true;

      console.log(`Group ${group}, Button ${index + 1} toggled: ${this.buttons[start + index]}`);

      // 버튼에 대한 동작 정의 (WebSocket 전송)
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({
            type: "Button",
            group: group,
            index: index + 1,
            value: this.buttons[start + index],
          })
        );
      }
    },

    // 현재 그룹에서 어떤 버튼이 활성화 상태인지 확인하는 메서드
    isActiveButton(group, index) {
      const start = (group - 1) * 4;
      return this.buttons[start + index];
    },

    selectGroup(group) {
      this.selectedGroup = group;
    },
    isActive(group) {
      return this.selectedGroup === group;
    },
    getButtonsForGroup(group) {
      const start = (group - 1) * 4;
      return this.buttons.slice(start, start + 4);
    },

    toggleButton(index) {
      this.buttons[index].active = !this.buttons[index].active;
      var state = this.buttons[index].active;
      console.log(`Button ${index + 1} toggled: ${this.buttons[index].active}`);


      // 버튼에 대한 동작 정의
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // if (index === 5) {
          // this.socket.send(JSON.stringify({ type: "Test", index: index + 1, value: state }));
        // } else {
          // this.socket.send(JSON.stringify({ type: "Test", index: index + 1, value: state }));
          this.socket.send(JSON.stringify({ type: "Button", index: index + 1, value: state }));
        // }
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

      const chatBox = this.$el.querySelector('.chat-box');
      if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
      }
      // 브라우저 창 전체를 스크롤하여 페이지의 맨 아래로 이동
      //window.scrollTo(0, document.body.scrollHeight);
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