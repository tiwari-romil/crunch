/* Crunch — Hridhaan's dragon quest.
   Each land teaches one idea in a comic, then a puzzle.
   A gate's run() is the whole gate lesson: buttons in, lamp on or off. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.CRAYON = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  var GATES = {
    same: {
      id: "same",
      name: "SAME",
      kid: "Copy",
      inputs: 1,
      color: "#1f9d4d",
      blurb: "Copy sends the signal straight through.",
      grown: "SAME is a wire. The lamp matches the button. On stays on, off stays off.",
      run: function (xs) { return !!xs[0]; }
    },
    not: {
      id: "not",
      name: "NOT",
      kid: "Opposite",
      inputs: 1,
      color: "#e43737",
      blurb: "Opposite flips the signal.",
      grown: "NOT flips the bit. If the button is 1, the lamp gets 0. If the button is 0, the lamp gets 1.",
      run: function (xs) { return !xs[0]; }
    },
    and: {
      id: "and",
      name: "AND",
      kid: "Both",
      inputs: 2,
      color: "#2f78e6",
      blurb: "Both waits until every button is pressed.",
      grown: "AND outputs 1 only when every input is 1. One button is not enough.",
      run: function (xs) { return !!(xs[0] && xs[1]); }
    },
    or: {
      id: "or",
      name: "OR",
      kid: "Either",
      inputs: 2,
      color: "#f07a12",
      blurb: "Either lets one button light the lamp.",
      grown: "OR outputs 1 when at least one input is 1. One signal is enough.",
      run: function (xs) { return !!(xs[0] || xs[1]); }
    }
  };

  var sw = { id: "switch", name: "Switch", color: "#e39b00" };
  var moon = { id: "moon", name: "Moon", color: "#6d4cc4" };

  var LEVELS = [
    {
      id: "tale-chase",
      kind: "tale",
      chapter: "gates",
      title: "The Chase",
      panels: [
        { art: "chase", who: "narrator", burst: "NIGHT", line: "In Paper Village, the lamp goes dark. A dragon named Blaze carries it away." },
        { art: "chase", who: "hridhaan", burst: "GO!", line: "I am Hridhaan. I will follow Blaze, and I will learn every lock." },
        { art: "signal", who: "narrator", burst: "ON", line: "The first lock is a signal. On or off. That is how a computer listens." }
      ]
    },
    {
      id: "wake-up",
      kind: "wake",
      chapter: "gates",
      title: "Signal Stone",
      speech: "Tap the signal stone. A tap is how Hridhaan talks to the computer.",
      yay: "The stone heard you. The bridge is waking up.",
      inputs: [],
      choices: [],
      rows: []
    },
    {
      id: "copy-cat",
      chapter: "gates",
      title: "Copy Cat",
      speech: "The bridge copies the switch. Drag Copy onto the wires.",
      hint: "Try Copy. The signal runs straight through.",
      yay: "Yes! That running color is the signal.",
      inputs: [sw],
      choices: ["same", "not"],
      answer: "same",
      rows: [
        { in: [false], out: false },
        { in: [true], out: true }
      ]
    },
    {
      id: "backwards",
      chapter: "gates",
      title: "Backwards Day",
      speech: "Drag the gate that does the opposite of the switch.",
      hint: "Try Opposite. The lamp glows while the switch rests.",
      yay: "Yes! NOT flips it. Off becomes on.",
      inputs: [sw],
      choices: ["same", "not"],
      answer: "not",
      rows: [
        { in: [true], out: false },
        { in: [false], out: true }
      ]
    },
    {
      id: "two-hands",
      chapter: "gates",
      title: "Two Hands",
      speech: "The lamp should wait until both buttons are pressed.",
      hint: "Try Both. The lamp wants every button.",
      yay: "Yes! AND means both buttons.",
      inputs: [sw, moon],
      choices: ["and", "or"],
      answer: "and",
      rows: [
        { in: [true, false], out: false },
        { in: [false, true], out: false },
        { in: [true, true], out: true }
      ]
    },
    {
      id: "one-enough",
      chapter: "gates",
      title: "One Is Enough",
      speech: "The lamp should glow if either button is pressed.",
      hint: "Try Either. One button can do it.",
      yay: "Yes! OR means either button.",
      inputs: [sw, moon],
      choices: ["and", "or"],
      answer: "or",
      rows: [
        { in: [false, false], out: false },
        { in: [true, false], out: true },
        { in: [false, true], out: true }
      ]
    },
    {
      id: "doorbell",
      chapter: "gates",
      title: "Doorbell",
      speech: "Light the doorbell lamp if the switch or the moon is pressed.",
      hint: "One button should be enough. Which gate is that?",
      yay: "You remembered. OR lights the lamp.",
      inputs: [sw, moon],
      choices: ["and", "or"],
      answer: "or",
      rows: [
        { in: [false, false], out: false },
        { in: [false, true], out: true },
        { in: [true, false], out: true }
      ]
    },
    {
      id: "tale-bags",
      kind: "tale",
      chapter: "bags",
      title: "Named Bags",
      panels: [
        { art: "bag", who: "blaze", burst: "BAG", line: "Blaze left a door in Bag Canyon. It only reads names." },
        { art: "bag", who: "hridhaan", burst: "Hearts", line: "A variable is a bag with a name. Hearts stays Hearts." },
        { art: "bag", who: "narrator", burst: "SWAP", line: "What is inside can change. That is how a computer remembers." }
      ]
    },
    {
      id: "bag-hearts",
      kind: "bags",
      mode: "count",
      chapter: "bags",
      title: "Three Hearts",
      speech: "The door reads the bag named Hearts. Put 3 hearts in Hearts.",
      hint: "Apples are a different bag. Only the name Hearts matters.",
      yay: "Hearts holds 3. The variable remembers it.",
      start: { hearts: 0, apples: 0 },
      goal: { hearts: 3 },
      bags: [
        { id: "hearts", name: "Hearts", token: "heart" },
        { id: "apples", name: "Apples", token: "apple" }
      ]
    },
    {
      id: "bag-add",
      kind: "bags",
      mode: "card",
      chapter: "bags",
      title: "Add Two",
      speech: "Hearts holds 1. Tap the card that changes it to 3.",
      hint: "Add 2 turns 1 into 3. Take 1 makes it smaller.",
      yay: "You changed what is inside. The name is still Hearts.",
      start: { hearts: 1 },
      goal: { hearts: 3 },
      bags: [{ id: "hearts", name: "Hearts", token: "heart" }],
      cards: [
        { id: "add2", name: "Add 2", delta: 2 },
        { id: "sub1", name: "Take 1", delta: -1 }
      ]
    },
    {
      id: "tale-loops",
      kind: "tale",
      chapter: "loops",
      title: "Again",
      panels: [
        { art: "loop", who: "narrator", burst: "ECHO", line: "Echo Cave copies a sound again and again." },
        { art: "loop", who: "hridhaan", burst: "AGAIN", line: "A loop means do the same thing again. You pick how many." },
        { art: "loop", who: "narrator", burst: "4", line: "Four means four times. The computer counts. It does not get tired." }
      ]
    },
    {
      id: "loop-stomps",
      kind: "loop",
      chapter: "loops",
      title: "Four Stomps",
      speech: "The cave wants 4 stomps. Set the loop, then press Go.",
      hint: "Count the dark footprints. The loop number should be 4.",
      yay: "The loop stomped again and again. You chose how many.",
      target: 4
    },
    {
      id: "tale-spells",
      kind: "tale",
      chapter: "spells",
      title: "Spell Cards",
      panels: [
        { art: "spell", who: "narrator", burst: "ZAP", line: "In Spell Tower, power hides inside named cards." },
        { art: "spell", who: "hridhaan", burst: "CARD", line: "A function is a card with a name. Shield means Block, then Spark." },
        { art: "spell", who: "narrator", burst: "CAST", line: "Say the name. Both steps happen, in that order." }
      ]
    },
    {
      id: "spell-shield",
      kind: "spell",
      chapter: "spells",
      title: "Shield Card",
      speech: "Build Shield. Block, then Spark. Nap does not belong. Then cast.",
      hint: "Look at the pictures. Block is first. Spark is second.",
      yay: "You called the function. Both steps happened.",
      recipe: ["block", "spark"],
      tray: ["block", "spark", "nap"],
      cast: "Cast Shield"
    },
    {
      id: "tale-steps",
      kind: "tale",
      chapter: "programs",
      title: "Step by Step",
      panels: [
        { art: "steps", who: "narrator", burst: "PATH", line: "Step Road is a thin bridge. One wrong step, and you stop." },
        { art: "steps", who: "hridhaan", burst: "1 2 3", line: "A program is steps in a line. First step, then the next." },
        { art: "steps", who: "narrator", burst: "ORDER", line: "Order matters. Copy the pictures from left to right." }
      ]
    },
    {
      id: "order-path",
      kind: "order",
      chapter: "programs",
      title: "Three Steps",
      speech: "The program is Right, Right, Jump. Put those steps in line, then press Go.",
      hint: "First step happens first. Sit is not in this program.",
      yay: "Hridhaan followed the program, one step at a time.",
      recipe: ["right", "right", "jump"],
      tray: ["right", "jump", "sit"],
      cast: "Go"
    },
    {
      id: "tale-dragon",
      kind: "tale",
      chapter: "dragon",
      title: "Dragon Peak",
      panels: [
        { art: "dragon", who: "blaze", burst: "ROAR", line: "Blaze waits at the peak. He still holds the village lamp." },
        { art: "chase", who: "hridhaan", burst: "READY", line: "I brought a bag, a loop, and a spell. Open the three locks." },
        { art: "dragon", who: "blaze", mood: "friend", burst: "3", line: "Show me. Then the lamp can go home." }
      ]
    },
    {
      id: "dragon-fight",
      kind: "boss",
      chapter: "dragon",
      title: "Three Locks",
      who: "blaze",
      speech: "Open every lock. Courage holds 2. Roar 3 times. Cast Shield.",
      hint: "One lock at a time. Use the idea that lock is asking for.",
      yay: "The locks spring open. Blaze bows, and the lamp is free.",
      locks: [
        { id: "bag", name: "Courage holds 2", target: 2 },
        { id: "loop", name: "Roar 3 times", target: 3 },
        { id: "spell", name: "Cast Shield" }
      ]
    }
  ];

  var SANDBOX = {
    id: "play-pad",
    title: "Free Draw",
    sandbox: true,
    speech: "Drag a gate onto the wires. Flip the switch. Watch the color.",
    inputs: [sw, moon],
    choices: ["same", "not", "and", "or"],
    rows: []
  };

  var CHAPTERS = [
    { id: "gates", title: "Signal Bridge", kicker: "Logic gates", blurb: "On, off, and the gates that decide." },
    { id: "bags", title: "Bag Canyon", kicker: "Variables", blurb: "A named bag remembers what you put inside." },
    { id: "loops", title: "Echo Cave", kicker: "Loops", blurb: "Do it again, as many times as you say." },
    { id: "spells", title: "Spell Tower", kicker: "Functions", blurb: "A named card runs every step inside it." },
    { id: "programs", title: "Step Road", kicker: "Programs", blurb: "Steps in a line. The first step happens first." },
    { id: "dragon", title: "Dragon Peak", kicker: "The fight", blurb: "Three locks. Then Hridhaan meets the dragon." }
  ];

  return { GATES: GATES, LEVELS: LEVELS, CHAPTERS: CHAPTERS, SANDBOX: SANDBOX };
});
