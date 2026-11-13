# Crunch

Bunny's dragon quest. Blaze took the village lamp, and Bunny follows him through a short comic that teaches the first ideas in computer science.

Each land opens with a page, then a puzzle. The computer can read the line aloud. Hear says it again. Mute stops the voice and the music.

## Play

On this PC, double-click `Start Crunch.bat`. Leave that window open. It opens the game in the browser and prints a link for phones on the same Wi-Fi. If Windows asks about the firewall, allow it on Private networks. Close the window to stop the game.

You can also open `index.html` in a browser. That plays on this computer only.

## The path

Lands open in order.

| Land | Idea | Kid word |
| --- | --- | --- |
| Signal Bridge | Logic gates | Copy, Opposite, Both, Either |
| Bag Canyon | Variables | A named bag that keeps a value |
| Echo Cave | Loops | Do it again a chosen number of times |
| Spell Tower | Functions | A named card of steps |
| Step Road | Programs | Steps in order |
| Dragon Peak | All three | Courage, a roar, and a shield |

Free draw is a sandbox for the four gates. It does not mark a page done.

## Grownups

Progress stays in this browser: finished pages, sound, the 1-and-0 wire setting, and the last place on the path. Opening Crunch again returns there.

**Reset progress** is on the cover, on the path, and in Grownups. It asks first. Confirm erases the stars and the saved place. Sound and the wire setting stay.

Keys while a gate puzzle is open: `1` flips the switch, `2` presses the moon, left and right arrows drop a gate, Escape returns to the path.

## Files

`index.html` is the page, `style.css` is the ink, `game.js` is the rules, and `levels.js` is the story. Pictures live in `art/`. `Start Crunch.bat` starts `serve-lan.ps1`, which serves this folder on this PC and on the local network.
