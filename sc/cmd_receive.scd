// OSC 메시지를 수신하고 해석하여 실행하는 OSCFunc 설정
(
o.free;
o = OSCdef(\cmd_revc, { |msg, time, addr, port|
    // msg 배열의 첫 번째 요소를 코드로 해석
    var code = msg[1];  // 메시지의 첫 번째 인자
	code = code.asString;
	code.class.postln;
	code.postln;  // 코드 출력 (디버깅용)

    // 수신된 코드를 실행
	code.interpret;  // SuperCollider 명령으로 해석하고 실행
}, '/runCode', recvPort: 57120);  // 메시지를 받을 주소와 포트 설정
)

s.dumpOSC(0); // 0: off, 1: on-parsed, 2: on-hex, 3: on-both