// OSC 메시지를 수신하고 해석하여 실행하는 OSCFunc 설정
// SynthDef 등록
(
~of1.free;
~of1 = OSCdef(\cmd_revc1, { |msg, time, addr, port|
    // msg 배열의 첫 번째 요소를 코드로 해석
    var code = msg[1];  // 메시지의 첫 번째 인자
	code = code.asString;
	code.class.postln;
	code.postln;  // 코드 출력 (디버깅용)

    // 수신된 코드를 실행
	code.interpretPrint;  // SuperCollider 명령으로 해석하고 실행

}, '/runCode', recvPort: 57120);  // 메시지를 받을 주소와 포트 설정
)


// OSC 메시지를 수신하고 해석하여 실행하는 OSCFunc 설정
// 등록된 SynthDef 실행 -> 소리 발
(
~of2.free;
~of2 = OSCdef(\cmd_revc2, { |msg, time, addr, port|
    // msg 배열의 첫 번째 요소를 코드로 해석
    var run, synthName = msg[1];  // 메시지의 첫 번째 인자
	synthName = synthName.asSymbol;
	synthName.postln;  // 코드 출력 (디버깅용)

    Synth(synthName);  // 해당 SynthDef의 이름으로 Synth 인스턴스 생성

}, '/playCode', recvPort: 57120);  // 메시지를 받을 주소와 포트 설정
)

s.dumpOSC(0); // 0: off, 1: on-parsed, 2: on-hex, 3: on-both
