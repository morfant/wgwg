<template>
  <div id="app">
    <div class="sidebar">
      <h2>AI Collaborator</h2>
      <ul>
        <li 
          v-for="menu in menus" 
          :key="menu" 
          @click="setActiveMenu(menu)"
          :class="{ active: menu === activeMenu }"
        >
          {{ menu }}
        </li>
      </ul>
    </div>
    <div class="main-container">
      <div class="chat-container">
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
    </div>
  </div>
</template>

<script>
import { marked } from "marked";
import html2pdf from 'html2pdf.js';

export default {
  data() {
    return {
      userInput: "",
      messages: [],
      isFetching: false,
      isReportEnd: false,
      isConnected: false, // 웹소켓 연결 상태
      websocket: null,
      menus: ["Research", "Rehearsal", "Feedback", "Product"], // 메뉴 항목 추가
      activeMenu: "Research", // 기본 메뉴 설정
    };
  },
  methods: {
    handleButtonClick() {
      if (!this.isFetching) {
        this.sendMessage();
      }
    },
    connectWebSocket() {
      console.log("connectWebSocket()");
      //this.websocket = new WebSocket("ws://unbarrier.net:4001/ws/chat"); // Deploy
      this.websocket = new WebSocket("ws://127.0.0.1:4001/ws/chat"); // Local test

      this.websocket.onopen = () => {
        console.log("WebSocket connection opened");
        this.isConnected = true; // 연결 성공 시 입력 활성화

        // 30초마다 ping 메시지 전송
        this.pingInterval = setInterval(() => {
                if (this.websocket.readyState === WebSocket.OPEN) {
                    this.websocket.send(JSON.stringify({ heartbeat : "ping" }));
                    console.log("ping");
                }
            }, 30000); // 30초
      };

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.response === "[END]"){
          if (data.agentType === "reporter") {
            this.isFetching = false;
            this.isReportEnd = true;
          }
        } else {
          const { agentType, response } = data;
          // console.log("agentType: ", agentType)
          if (
            this.messages.length > 0 &&
            this.messages[this.messages.length - 1].sender === "Bot" &&
            this.messages[this.messages.length - 1].agentType === agentType
          ) {
            // msg block에 내용 업데이트
            const lastMessage = this.messages[this.messages.length - 1];
            lastMessage.text = response;
            this.isFetching = false;
          } else {
            // msg block 새로 만듦
            this.messages.push({ sender: "Bot", text: response, agentType: agentType });
          }
          this.updateScroll(); // 메시지가 추가될 때마다 스크롤
        }
      };

      this.websocket.onclose = () => {
        console.log("WebSocket connection closed");
        this.isConnected = false; // 연결 종료 시 입력 비활성화
        this.isFetching = false;
        // ping 메시지 전송 중지
        clearInterval(this.pingInterval);
      };

      this.websocket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.isConnected = false; // 에러 발생 시 입력 비활성화
        this.isFetching = false;
        // ping 메시지 전송 중지
        clearInterval(this.pingInterval);
      };
    },
    sendMessage() {
      console.log("sendMessage()");
      if (this.userInput.trim() === "") return;
      this.messages.push({
        sender: "User",
        text: this.userInput,
        agentType: "User",
      });
      this.isFetching = true; // 메시지 전송 시 로딩 상태 설정
      this.isReportEnd = false;
      this.websocket.send(JSON.stringify({ message: this.userInput }));
      this.userInput = "";
      this.updateScroll(); // 메시지 전송 후 스크롤
    },
    setActiveMenu(menu) {
      this.activeMenu = menu; // 선택된 메뉴 항목 설정
    },
    renderMessage(text) {
      return marked.parse(text);
    },
    updateScroll() {
      // 브라우저 창 전체를 스크롤하여 페이지의 맨 아래로 이동
      window.scrollTo(0, document.body.scrollHeight);
    },
    downloadPDF(index) {
      const message = this.messages[index];

      // Markdown 형식의 텍스트를 HTML로 변환
      const htmlContent = marked.parse(message.text);
      
      // 스타일을 적용하기 위한 HTML 구조 생성
      const content = `
        <div id="pdf-content" style="
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
          line-height: 1.5;
        ">
          ${htmlContent}
        </div>
      `;
      
      // 임시로 HTML 콘텐츠를 문서에 추가
      const div = document.createElement("div");
      div.innerHTML = content;
      document.body.appendChild(div);

      // // CSS 파일을 동적으로 로드
      // const link = document.createElement('link');
      // link.rel = 'stylesheet';
      // link.href = '/static/pdf_styles.css'; // CSS 파일 경로
      // document.head.appendChild(link);

      // html2pdf.js를 사용하여 PDF로 변환
      const element = document.getElementById('pdf-content');
      const options = {
        margin: [5, 10], // top/bottom, left/right
        filename: `message-${index + 1}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().from(element).set(options).save().then(() => {
        // PDF 저장 후, 임시로 추가한 HTML 콘텐츠를 제거
        document.body.removeChild(div);
        // document.head.removeChild(link);
      });
    }
  },
  mounted() {
    this.connectWebSocket();
  },
};
</script>

<style src="./App.css"></style>
