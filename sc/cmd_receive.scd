(
// OSC 메시지를 수신하고 해석하여 실행하는 OSCFunc 설정
// SynthDef 등록
~of1.free;
~of1 = OSCdef(\cmd_revc1, { |msg, time, addr, port|
    // msg 배열의 첫 번째 요소를 코드로 해석
    var code = msg[1];  // 메시지의 첫 번째 인자
	code = code.asString;
	code.class.postln;
	code.postln;  // 코드 출력 (디버깅용)

    // 수신된 코드를 실행
	code.interpretPrint;  // SuperCollider 명령으로 해석하고 실행

}, '/registerSynth', recvPort: 57120);  // 메시지를 받을 주소와 포트 설정


// OSC 메시지를 수신하고 해석하여 실행하는 OSCFunc 설정
// 등록된 SynthDef 실행 -> 소리 발생
~of2.free;
~of2 = OSCdef(\cmd_revc2, { |msg, time, addr, port|
    // msg 배열의 첫 번째 요소를 코드로 해석
    var run, synthName = msg[1];  // 메시지의 첫 번째 인자
	synthName = synthName.asSymbol;
	synthName.postln;  // 코드 출력 (디버깅용)
	Synth(synthName);  // 해당 SynthDef의 이름으로 Synth 인스턴스 생성

}, '/playSynth', recvPort: 57120);  // 메시지를 받을 주소와 포트 설정


/*
// Pattern(Pdef) 등록
~of3.free;
~of3 = OSCdef(\cmd_revc3, { |msg, time, addr, port|
    // msg 배열의 첫 번째 요소를 코드로 해석
	var pat, code = msg[1];

	("code: " + code).postln;
	code = code.asString;
	code.interpretPrint;  // SuperCollider 명령으로 해석하고 실행

}, '/registerPattern', recvPort: 57120);  // 메시지를 받을 주소와 포트 설정
*/


// Pattern + instrument 실행
~of4.free;
~of4 = OSCdef(\cmd_revc4, { |msg, time, addr, port|
    // msg 배열의 첫 번째 요소를 코드로 해석
	var pat, code = msg[1], synth = msg[2];  // 메시지의 첫 번째 인자

	("code: " + code).postln;
	("synth: " + synth).postln;
	code = code.asString;
	synth = synth.asSymbol;

	pat = code.interpretPrint;  // SuperCollider 명령으로 해석하고 실행

	(pat <> (instrument: synth)).play;



}, '/playPattern', recvPort: 57120);  // 메시지를 받을 주소와 포트 설정
)



s.dumpOSC(1); // 0: off, 1: on-parsed, 2: on-hex, 3: on-both
s.dumpOSC(0); // 0: off, 1: on-parsed, 2: on-hex, 3: on-both
