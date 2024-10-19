"./sounds.scd".loadRelative;


(
//Vars
~synth_1 = nil;
~morse_harmonic = Array.newClear(3);
~morse_harmonic[0] = [500, 700, 900, 400, 600].scramble;
~morse_harmonic[1] = [500, 700, 900, 400, 600, 100, 1500, 2100].scramble;
~morse_harmonic[2] = [500, 700, 900, 400, 600, 1300, 1800].scramble;

~morse_base = Array.newClear(100);
~morse_chain = Array.newClear(100);

~t_clocks = Array.fill(10, {TempoClock.new()});



// Functions
~print_arr = {|arr|
	arr.do{|item, index|
		("item: " + item + " index: " + index).postln;
	}
};



// MorseCodes Receiver
OSCdef(\morseCode, { |msg|
	var idx, str, list;
	var shortDur = 0.1;  // 짧은 소리 지속 시간
	var longDur = 0.3;   // 긴 소리 지속 시간
	var pauseDur = 0.5;  // 공백 대기 시간


	idx = msg[2].asInteger;
	("========= MoseCode "++idx++" =========").postln;
	("msg: "++msg).postln;  // 수신된 메시지 출력
	str = msg[1].asString;
	("str: " + str).postln;
	("idx: " + idx).postln;
	list = Array.newClear(str.size);

	str.do{|char , i|
		if (char.asString == "0", {list.put(i, shortDur)});
		if (char.asString == "1", {list.put(i, longDur)});
		if (char.asString == "2", {list.put(i, pauseDur)});
	};
	("list: "++list).postln;

	~morse_base[idx] = Pdef("morsePlayer_"++idx,
		Pbind(
			\instrument, "morse_"++idx,
			// \midinote, 68,
			\freq, Pseq(~morse_harmonic[idx], inf),
			\detune, 0.0,
			\tempo, 1.0,
			\dur, Pseq(list, inf) * Pfunc { |ev| ev[\tempo] },

	));

	~morse_chain[idx].stop;
	~morse_chain[idx] =
	(Pbind(\tempo, 1.0) <> ~morse_base[idx]).play(~t_clocks[idx]);

}, '/morse_code', recvPort: 57120);





// Buttons
//============= b-1 =============
OSCdef(\cmd_revc1, { |msg, time, addr, port|
	"====Button_1====".postln;
	msg.postln;
	// msg[1].postln;
	// msg[1].class.postln;
	if (msg[1].class == True,
		{ ~synth_1 = Synth(\sound_1) }
	);

	if (msg[1].class == False,
		{ ~synth_1.free }
	);

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
OSCdef(\sliders, { |msg, time, addr, port|
	var val = nil;
	"====Slider_1====".postln;
	msg.postln;
	val = msg[1].asInteger;
	val.class.postln;
	val = val.linlin(0, 100, 0.1, 1.2);
	// ~synth_1.set(\freq, val);
	val.postln;

	~morse_chain[1].stop;
	~morse_chain[1] =
	(Pbind(\tempo, val) <> ~morse_base[1]).play(~t_clocks[1]);


}, '/set_slider', recvPort: 57120);



//============= s-1 =============
OSCdef(\cmd_revc7, { |msg, time, addr, port|
	var val = nil;
	"====Slider_1====".postln;
	msg.postln;
	val = msg[1].asInteger;
	val.class.postln;
	val = val.linlin(0, 100, 0.1, 1.2);
	// ~synth_1.set(\freq, val);
	val.postln;

	~morse_chain[1].stop;
	~morse_chain[1] =
	(Pbind(\tempo, val) <> ~morse_base[1]).play(~t_clocks[1]);


}, '/set_synth_1', recvPort: 57120);


//============= s-2 =============
OSCdef(\cmd_revc8, { |msg, time, addr, port|
	var val = nil;
	"====Slider_2====".postln;
	msg.postln;
	val = msg[1].asInteger;
	val.class.postln;
	val = val.linlin(0, 100, 0.1, 1.2);
	val.postln;

	~morse_chain[2].stop;
	~morse_chain[2] =
	(Pbind(\tempo, val) <> ~morse_base[2]).play(~t_clocks[2]);


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





// Reverb
~rev = Synth(\FreeVerb2x2, [
	\outbus, 0,
	\mix, 0.4,
	\room, 0.2,
	\damp, 0.5,
], addAction:\addToTail);


// Limiter
~lim = Synth(\Limiter, [
	\in, 0,
	\ceil, 0.8,
	\relTime, 0.01,
	\amp, 0.8
], target: ~rev, addAction: \addBefore);



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



