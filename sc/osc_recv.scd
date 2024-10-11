(

// Buttons
//============= b-1 =============
OSCdef(\cmd_revc1, { |msg, time, addr, port|
	"====Button_1====".postln;
	msg.postln;

}, '/play_synth_1', recvPort: 57120);


//============= b-2 =============
OSCdef(\cmd_revc2, { |msg, time, addr, port|
	"====Button_2====".postln;
	msg.postln;

}, '/play_synth_2', recvPort: 57120);


//============= b-3 =============
OSCdef(\cmd_revc3, { |msg, time, addr, port|
	"====Button_3====".postln;
	msg.postln;

}, '/play_synth_3', recvPort: 57120);


//============= b-4 =============
OSCdef(\cmd_revc4, { |msg, time, addr, port|
	"====Button_4====".postln;
	msg.postln;

}, '/play_synth_4', recvPort: 57120);


//============= b-5 =============
OSCdef(\cmd_revc5, { |msg, time, addr, port|
	"====Button_5====".postln;
	msg.postln;

}, '/play_synth_5', recvPort: 57120);


//============= b-6 =============
OSCdef(\cmd_revc6, { |msg, time, addr, port|
	"====Button_6====".postln;
	msg.postln;

}, '/play_synth_6', recvPort: 57120);


// Sliders
//============= s-1 =============
OSCdef(\cmd_revc7, { |msg, time, addr, port|
	"====Slider_1====".postln;
	msg.postln;

}, '/set_synth_1', recvPort: 57120);


//============= s-2 =============
OSCdef(\cmd_revc8, { |msg, time, addr, port|
	"====Slider_2====".postln;
	msg.postln;

}, '/set_synth_2', recvPort: 57120);


//============= s-3 =============
OSCdef(\cmd_revc9, { |msg, time, addr, port|
	"====Slider_3====".postln;
	msg.postln;

}, '/set_synth_3', recvPort: 57120);


//============= s-4 =============
OSCdef(\cmd_revc10, { |msg, time, addr, port|
	"====Slider_4====".postln;
	msg.postln;

}, '/set_synth_4', recvPort: 57120);


//============= s-5 =============
OSCdef(\cmd_revc11, { |msg, time, addr, port|
	"====Slider_5====".postln;
	msg.postln;

}, '/set_synth_5', recvPort: 57120);


//============= s-6 =============
OSCdef(\cmd_revc12, { |msg, time, addr, port|
	"====Slider_6====".postln;
	msg.postln;

}, '/set_synth_6', recvPort: 57120);



// limiter
{
	arg ceil = 0.8, relTime = 0.01, amp = 0.8;
    var source, limitedSignal;

	limitedSignal = Limiter.ar(In.ar(100), ceil, relTime);

	Out.ar(0, Pan2.ar(limitedSignal, 0, amp));
}.play;

)



s.dumpOSC(1); // 0: off, 1: on-parsed, 2: on-hex, 3: on-both
s.dumpOSC(0); // 0: off, 1: on-parsed, 2: on-hex, 3: on-both




// _가 포함된 이름을 제외한 등록된 Synth 이름을 가져오는 예제
(
SynthDescLib.global.synthDescs
.select { |desc| desc.name.contains("_").not }  // _가 포함되지 않은 항목만 선택
.collect { |desc| desc.name }
.do { |synthName| synthName.postln; };
)



