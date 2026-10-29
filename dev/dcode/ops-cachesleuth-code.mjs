/* CacheSleuth text code tools -------------------------------------------------
 * Text-only Code Tools from cachesleuth.com, recreated locally. Image, audio,
 * dictionary and interpreter tools are intentionally absent: they need data
 * that is not part of a self-contained page (or produce an image rather than
 * text). Each operation below is deterministic and runs in the worker.
 */

const GROUP = "CacheSleuth · Code tools";
const BASE_OPTIONS = ["Start at letters", "Start at numbers", "Start at functions"];
const VANITY_MODES = ["Repeated key presses", "Key + position", "T9 keys only"];
const SPELLING_ALPHABETS = ["NATO / ICAO", "APCO / Police", "US Joint Army/Navy"];
const FOUR_OPTIONS = ["Closed 4 = 1", "Open 4 = 0"];

export const ops = [
    /* ---------------------------------------------------------------- symbol alphabets */
    {
        name: "Abaddon Code Encode",
        group: GROUP,
        description: "Abaddon code: A-Z and space each become a three-character group drawn from ¥, µ and þ. The table is the canonical alphabet from the CacheSleuth tool; unknown characters become question marks.",
        args: [],
        run: (input) => csAbaddonRun(input, false)
    },
    {
        name: "Abaddon Code Decode",
        group: GROUP,
        description: "Abaddon decoder: reads whitespace-separated three-character groups back to A-Z, with ¥µµ as the space character. An unrecognised group becomes a question mark.",
        args: [],
        run: (input) => csAbaddonRun(input, true)
    },
    {
        name: "Backslash Code Encode",
        group: GROUP,
        description: "Backslash code: every letter becomes three symbols from |, / and \\, written as one continuous stream. Spaces and unsupported characters are dropped.",
        args: [],
        run: (input) => csBackslashRun(input, false)
    },
    {
        name: "Backslash Code Decode",
        group: GROUP,
        description: "Backslash decoder: reads the continuous stream three symbols at a time. Whitespace is ignored; an unknown triple becomes a question mark.",
        args: [],
        run: (input) => csBackslashRun(input, true)
    },
    {
        name: "Chinese Code Encode",
        group: GROUP,
        description: "Chinese code: each letter is a spaced group of dashes and pipes, from - for A through ||------ for Z. Spaces and unsupported characters are dropped.",
        args: [],
        run: (input) => csChineseRun(input, false)
    },
    {
        name: "Chinese Code Decode",
        group: GROUP,
        description: "Chinese code decoder: reads whitespace-separated dash-and-pipe groups back to letters. An unknown group becomes a question mark.",
        args: [],
        run: (input) => csChineseRun(input, true)
    },
    {
        name: "Slash and Pipe Encode",
        group: GROUP,
        description: "Slash-and-pipe code: each letter is a group of one to four slash, pipe and backslash symbols, spaced apart. Spaces and unsupported characters are dropped.",
        args: [],
        run: (input) => csSlashPipeRun(input, false)
    },
    {
        name: "Slash and Pipe Decode",
        group: GROUP,
        description: "Slash-and-pipe decoder: reads space-separated symbol groups. Unknown groups become question marks.",
        args: [],
        run: (input) => csSlashPipeRun(input, true)
    },
    {
        name: "Spirit DVD Encode",
        group: GROUP,
        description: "Spirit DVD code: a variable-length line-and-pipe alphabet, written as one stream. Spaces and unsupported characters are dropped.",
        args: [],
        run: (input) => csSpiritRun(input, false)
    },
    {
        name: "Spirit DVD Decode",
        group: GROUP,
        description: "Spirit DVD decoder: greedily matches the longest known line-and-pipe pattern. Whitespace is ignored; an unmatched symbol becomes a question mark.",
        args: [],
        run: (input) => csSpiritRun(input, true)
    },

    /* ---------------------------------------------------------------- numeric / segment codes */
    {
        name: "Decabit Encode",
        group: GROUP,
        description: "Decabit code: every letter and digit becomes a ten-character + or - pattern. Groups are separated by spaces; unsupported characters are dropped.",
        args: [],
        run: (input) => csDecabitRun(input, false)
    },
    {
        name: "Decabit Decode",
        group: GROUP,
        description: "Decabit decoder: reads space-separated ten-character + and - groups back to A-Z or 0-9. Unknown groups become question marks.",
        args: [],
        run: (input) => csDecabitRun(input, true)
    },
    {
        name: "DTMF Encode",
        group: GROUP,
        description: "DTMF encoder: maps the sixteen phone-keypad characters to their low and high frequency pair, row first, separated by spaces.",
        args: [],
        run: (input) => csDtmfRun(input, false)
    },
    {
        name: "DTMF Decode",
        group: GROUP,
        description: "DTMF decoder: reads frequency pairs row first and maps them back to 0-9, A-D, * and #. An unknown pair becomes a question mark.",
        args: [],
        run: (input) => csDtmfRun(input, true)
    },
    {
        name: "Quadoo Encode",
        group: GROUP,
        description: "Quadoo: each letter is a spaced set of the nine segment labels that light up; A is 25, B is 1235, and so on. Spaces and unsupported characters are dropped.",
        args: [],
        run: (input) => csQuadooRun(input, false)
    },
    {
        name: "Quadoo Decode",
        group: GROUP,
        description: "Quadoo decoder: reads space-separated segment-label sets back to letters. Unknown sets become question marks.",
        args: [],
        run: (input) => csQuadooRun(input, true)
    },
    {
        name: "Seven-Segment Display Encode",
        group: GROUP,
        description: "Seven-segment display: each letter or digit becomes the spaced set of lit segments, where A is ABCEFG and 8 is ABCDEFG. Spaces are ignored.",
        args: [],
        run: (input) => csSegmentRun(input, false)
    },
    {
        name: "Seven-Segment Display Decode",
        group: GROUP,
        description: "Seven-segment decoder: reads space-separated segment sets back to the matching letter or digit. Unknown sets become question marks.",
        args: [],
        run: (input) => csSegmentRun(input, true)
    },
    {
        name: "Letters to Numbers",
        group: GROUP,
        description: "A1Z26 conversion: each letter becomes its position from 1 to 26, separated by spaces. A word gap is written as a double space; unsupported characters are dropped.",
        args: [],
        run: (input) => csLettersRun(input, false)
    },
    {
        name: "Numbers to Letters",
        group: GROUP,
        description: "A1Z26 decoder: numbers 1-26 become letters and a double space becomes a word gap. Values outside 1-26 are left as text.",
        args: [],
        run: (input) => csLettersRun(input, true)
    },

    /* ---------------------------------------------------------------- keyboard codes */
    {
        name: "To Dvorak",
        group: GROUP,
        description: "Re-maps text typed on a QWERTY layout as if the same keys were on a Dvorak layout. Case is preserved, and characters that are identical on both layouts pass through.",
        args: [],
        run: (input) => csDvorakRun(input, false)
    },
    {
        name: "To Qwerty",
        group: GROUP,
        description: "The reverse of To Dvorak: maps Dvorak key positions back to the QWERTY characters in the same positions.",
        args: [],
        run: (input) => csDvorakRun(input, true)
    },
    {
        name: "Qwerty Coordinates Encode",
        group: GROUP,
        description: "Qwerty coordinates: each letter becomes its key position, with the start row chosen here. For example A is 22 when the letter rows start at 1.",
        args: [
            {name: "Start row", type: "option", value: BASE_OPTIONS}
        ],
        run: (input, args) => csQwertyCoordRun(input, args[0], false)
    },
    {
        name: "Qwerty Coordinates Decode",
        group: GROUP,
        description: "Qwerty coordinate decoder: reads row-and-column numbers back to letters. Use the same start row as the encoder.",
        args: [
            {name: "Start row", type: "option", value: BASE_OPTIONS}
        ],
        run: (input, args) => csQwertyCoordRun(input, args[0], true)
    },
    {
        name: "Qwerty Shifter Encode",
        group: GROUP,
        description: "Qwerty shifter: moves each character one or more places along the QWERTY key row order, wrapping at the end. Letters and digits are handled; punctuation is optional.",
        args: [
            {name: "Direction", type: "option", value: ["Right", "Left"]},
            {name: "Amount", type: "number", value: 1},
            {name: "Keyboard", type: "option", value: ["A-Z and 0-9", "Include punctuation"]}
        ],
        run: (input, args) => csQwertyShiftRun(input, args[0], args[1], args[2] === "Include punctuation", false)
    },
    {
        name: "Qwerty Shifter Decode",
        group: GROUP,
        description: "Qwerty shifter decoder: shifts the characters the opposite way. Use the same direction and amount as the encoder.",
        args: [
            {name: "Direction", type: "option", value: ["Right", "Left"]},
            {name: "Amount", type: "number", value: 1},
            {name: "Keyboard", type: "option", value: ["A-Z and 0-9", "Include punctuation"]}
        ],
        run: (input, args) => csQwertyShiftRun(input, args[0], args[1], args[2] === "Include punctuation", true)
    },
    {
        name: "Vanity Encode",
        group: GROUP,
        description: "Vanity phone code: letters become keypad presses. Repeated key presses repeats the digit, Key + position writes key and position, and T9 keys writes only the digit. Space becomes 0.",
        args: [
            {name: "Mode", type: "option", value: VANITY_MODES}
        ],
        run: (input, args) => csVanityRun(input, args[0], false)
    },
    {
        name: "Vanity Decode",
        group: GROUP,
        description: "Vanity decoder: reads keypad presses back to letters using the chosen mode. A lone 0 becomes a space.",
        args: [
            {name: "Mode", type: "option", value: VANITY_MODES}
        ],
        run: (input, args) => csVanityRun(input, args[0], true)
    },

    /* ---------------------------------------------------------------- visual / display codes */
    {
        name: "Beghilos Encode",
        group: GROUP,
        description: "Calculator spelling: B, E, G, H, I, L, O and S become 8, 3, 9, 4, 1, 7, 0 and 5, then the whole string is reversed so it reads on an upside-down calculator. Unsupported letters become question marks.",
        args: [],
        run: (input) => csBeghilosRun(input, false)
    },
    {
        name: "Beghilos Decode",
        group: GROUP,
        description: "Calculator spelling decoder: reverses the number and maps its digits back to letters. 9 becomes G and 6 becomes g, matching the tool.",
        args: [],
        run: (input) => csBeghilosRun(input, true)
    },
    {
        name: "Upside-Down Text Flip",
        group: GROUP,
        description: "Flips text 180 degrees: the string is reversed and characters are replaced by their upside-down lookalikes. Supports letters, digits and common punctuation.",
        args: [],
        run: (input) => csUpsideDownRun(input, false)
    },
    {
        name: "Upside-Down Text Unflip",
        group: GROUP,
        description: "Unflips upside-down text by reversing it and applying the inverse lookalike map.",
        args: [],
        run: (input) => csUpsideDownRun(input, true)
    },
    {
        name: "Zalgo Text Encode",
        group: GROUP,
        description: "Zalgo text: stacks Unicode combining marks over each non-space character. Mild, Medium and Wild choose how many marks are added; the result is deterministic.",
        args: [
            {name: "Intensity", type: "option", value: ["mild", "medium", "wild"]}
        ],
        run: (input, args) => csZalgoRun(input, args[0], false)
    },
    {
        name: "Zalgo Text Decode",
        group: GROUP,
        description: "Zalgo cleaner: removes combining marks and leaves the base characters behind.",
        args: [],
        run: (input) => csZalgoRun(input, "medium", true)
    },
    {
        name: "Enclosed Areas",
        group: GROUP,
        description: "Counts the enclosed areas in each character (A, B, D, O, P, Q, R, a, b, d, e, g, o, p, q, 0, 6, 8 and 9) and prints a per-character list plus a grand total. Choose whether 4 counts as closed.",
        args: [
            {name: "4", type: "option", value: FOUR_OPTIONS}
        ],
        run: (input, args) => csEnclosedAreasRun(input, args[0])
    },

    /* ---------------------------------------------------------------- spoken alphabets */
    {
        name: "Spelling Alphabet Encode",
        group: GROUP,
        description: "Replaces each letter with its spelling-alphabet word. NATO/ICAO is the default; APCO/Police and US Joint Army/Navy are also included. A space becomes (space).",
        args: [
            {name: "Alphabet", type: "option", value: SPELLING_ALPHABETS}
        ],
        run: (input, args) => csSpellingRun(input, args[0], false)
    },
    {
        name: "Spelling Alphabet Decode",
        group: GROUP,
        description: "Reads spelling-alphabet words back to letters. Case and hyphens are ignored, the common spellings Alpha/Juliett/Juliet/Whisky/X-ray/Xray are accepted, hyphen-separated words decode, and (space) becomes a space.",
        args: [
            {name: "Alphabet", type: "option", value: SPELLING_ALPHABETS}
        ],
        run: (input, args) => csSpellingRun(input, args[0], true)
    },

    /* ---------------------------------------------------------------- remaining text-only tools */
    {
        name: "Baudot Encode",
        group: GROUP,
        description: "Baudot telegraph code: writes the five-bit ITA2 (Baudot-Murray) code for each character, switching to figures for digits and punctuation and back to letters for text. ITA1 is also available. Unsupported characters are dropped.",
        args: [
            {name: "Variant", type: "option", value: ["Baudot-Murray (ITA2)", "Baudot (ITA1)"]}
        ],
        run: (input, args) => csBaudotRun(input, args[0], false)
    },
    {
        name: "Baudot Decode",
        group: GROUP,
        description: "Reads groups of five bits as Baudot, honouring the letters and figures shift codes. Use the same variant as the encoder.",
        args: [
            {name: "Variant", type: "option", value: ["Baudot-Murray (ITA2)", "Baudot (ITA1)"]}
        ],
        run: (input, args) => csBaudotRun(input, args[0], true)
    },
    {
        name: "GoldBug Encode",
        group: GROUP,
        description: "GoldBug code: each lowercase letter is replaced by one of 26 symbols (5 2 - † 8 ... [). Case is ignored on encode, and characters outside A-Z pass through.",
        args: [],
        run: (input) => csGoldbugRun(input, false)
    },
    {
        name: "GoldBug Decode",
        group: GROUP,
        description: "GoldBug decoder: reads the 26 symbols back to lowercase letters. Spaces separate cipher groups and are preserved.",
        args: [],
        run: (input) => csGoldbugRun(input, true)
    },
    {
        name: "Hodor Encode",
        group: GROUP,
        description: "Hodor text: each letter becomes a Hodor word (HODOR, Hodor!, hodor? and so on). The original tool strips existing H, O, D and R letters before encoding; this recreation does the same.",
        args: [],
        run: (input) => csHodorRun(input, false)
    },
    {
        name: "Hodor Decode",
        group: GROUP,
        description: "Hodor decoder: reads the Hodor words back to letters. Words are separated by whitespace and unrecognised words are ignored.",
        args: [],
        run: (input) => csHodorRun(input, true)
    },
    {
        name: "Nak Nak Encode",
        group: GROUP,
        description: "Nak Nak: turns each UTF-16 code unit into two hexadecimal digits, then writes each digit as a Nak word. The result is a space-separated stream.",
        args: [],
        run: (input) => csNakRun(input, false)
    },
    {
        name: "Nak Nak Decode",
        group: GROUP,
        description: "Nak Nak decoder: reads pairs of Nak words as hexadecimal digits and rebuilds the original characters. Unknown words are reported in [?brackets?].",
        args: [],
        run: (input) => csNakRun(input, true)
    },
    {
        name: "Navajo Code Talkers Encode",
        group: GROUP,
        description: "Navajo code-talker alphabet: each letter becomes the first Navajo word for it (Wol-La-Chee for A, Shush for B, and so on). Non-letters pass through, with a double space marking a word gap.",
        args: [],
        run: (input) => csNavajoRun(input, false)
    },
    {
        name: "Navajo Code Talkers Decode",
        group: GROUP,
        description: "Navajo code-talker decoder: matches any of the published words for each letter. A double space becomes a word gap; a newline is kept.",
        args: [],
        run: (input) => csNavajoRun(input, true)
    },
    {
        name: "Tap / Knock Code Encode",
        group: GROUP,
        description: "Tap or knock code: maps letters (and digits in the 6 x 6 grid) to row-column pairs. Numbers writes 11 23, Dots writes . ..; choose the grid used by the message.",
        args: [
            {name: "Format", type: "option", value: ["Numbers", "Dots"]},
            {name: "Grid", type: "option", value: ["5 x 5 (A-Z, C/K)", "6 x 6 (A-Z, 0-9)"]}
        ],
        run: (input, args) => csTapRun(input, args[0], args[1], false)
    },
    {
        name: "Tap / Knock Code Decode",
        group: GROUP,
        description: "Tap or knock decoder: reads number pairs or dot groups back to letters. Use the same format and grid as the encoder.",
        args: [
            {name: "Format", type: "option", value: ["Numbers", "Dots"]},
            {name: "Grid", type: "option", value: ["5 x 5 (A-Z, C/K)", "6 x 6 (A-Z, 0-9)"]}
        ],
        run: (input, args) => csTapRun(input, args[0], args[1], true)
    },
    {
        name: "Number Pad Lines Encode",
        group: GROUP,
        description: "Number-pad line code: traces each letter or digit on a phone keypad and writes the keys it passes through, from 7295 for A through 793146 for 9. Spaces are dropped.",
        args: [],
        run: (input) => csNumberPadRun(input, false)
    },
    {
        name: "Number Pad Lines Decode",
        group: GROUP,
        description: "Number-pad line decoder: reads the key paths back to letters and digits. Tokens that are already plain letters or digits pass through; unknown paths become question marks.",
        args: [],
        run: (input) => csNumberPadRun(input, true)
    },
    {
        name: "Brainfuck & Ook! Encode",
        group: GROUP,
        description: "Compiles text to a Brainfuck program, or writes that program in Ook! or short Ook! notation. Each byte is emitted from a fresh cell, so the result runs in any standard interpreter.",
        args: [
            {name: "Mode", type: "option", value: ["Brainfuck", "Ook!", "Short Ook!"]}
        ],
        run: (input, args) => csBfOokRun(input, args[0], false)
    },
    {
        name: "Brainfuck & Ook! Decode",
        group: GROUP,
        description: "Runs a Brainfuck, Ook! or short Ook! program and returns its output. Input commands (,) read from empty input, so they produce zero bytes.",
        args: [
            {name: "Mode", type: "option", value: ["Brainfuck", "Ook!", "Short Ook!"]}
        ],
        run: (input, args) => csBfOokRun(input, args[0], true)
    },
    {
        name: "Cow Encode",
        group: GROUP,
        description: "Cow language: compiles text into a Cow program built from the twelve moo commands. It is the same generated code shape as the CacheSleuth tool and prints the original text when run.",
        args: [],
        run: (input) => csCowEncode(input)
    },
    {
        name: "Cow Decode",
        group: GROUP,
        description: "Cow interpreter: runs a Cow program and returns everything it prints. The twelve commands handle tape movement, arithmetic, loops, I/O and the two storage registers.",
        args: [],
        run: (input) => csCowDecode(input)
    },
    {
        name: "Clock Code Encode",
        group: GROUP,
        description: "Clock code: A is AM, B through Y are the hours 1-24, Z is PM and a word gap is 00. Values are separated by colons, so ABC becomes AM:1:2.",
        args: [],
        run: (input) => csClockRun(input, false)
    },
    {
        name: "Clock Code Decode",
        group: GROUP,
        description: "Clock code decoder: reads colon-separated clock values back to letters and turns 00 into a space. Unknown values are left in the output as text.",
        args: [],
        run: (input) => csClockRun(input, true)
    },
    {
        name: "Five Needle Telegraph Encode",
        group: GROUP,
        description: "Cooke and Wheatstone five-needle telegraph: each letter becomes a five-symbol group of slashes and pipes. C, J, Q, V, X and Z are not in the alphabet and are dropped.",
        args: [],
        run: (input) => csFiveNeedleRun(input, false)
    },
    {
        name: "Five Needle Telegraph Decode",
        group: GROUP,
        description: "Five-needle telegraph decoder: reads groups of five slash, pipe and backslash symbols back to letters. Unknown groups become question marks.",
        args: [],
        run: (input) => csFiveNeedleRun(input, true)
    },
    {
        name: "Kenny Encode",
        group: GROUP,
        description: "Kenny code: turns each letter into a three-syllable m/f/p word, from mmm for A through ffp for Z. Letters are written as one continuous stream; other characters pass through.",
        args: [],
        run: (input) => csKennyRun(input, false)
    },
    {
        name: "Kenny Decode",
        group: GROUP,
        description: "Kenny decoder: reads runs of three m, f and p syllables back to letters. Characters outside the code are preserved and unknown groups become question marks.",
        args: [],
        run: (input) => csKennyRun(input, true)
    },
    {
        name: "Leet Encode",
        group: GROUP,
        description: "Leet or visual substitution: replaces letters with lookalike numbers and symbols. Light maps the six classic letters, Classic adds more, Advanced covers A-Z, and HTML-safe avoids angle brackets.",
        args: [
            {name: "Style", type: "option", value: ["Light", "Classic", "Advanced", "HTML-safe"]}
        ],
        run: (input, args) => csLeetRun(input, args[0], false)
    },
    {
        name: "Leet Decode",
        group: GROUP,
        description: "Leet decoder: reads numbers, symbols and HTML entities back to uppercase letters. Leet is ambiguous, so this takes the longest matching symbol and its preferred letter.",
        args: [],
        run: (input) => csLeetRun(input, "Advanced", true)
    },
    {
        name: "Morse Encode",
        group: GROUP,
        description: "International Morse: letters are separated by the chosen separator and words by a doubled separator. The puzzle variants can reverse the stream, swap dots and dashes, or do both.",
        args: [
            {name: "Variant", type: "option", value: ["Standard", "Reverse sequence", "Swap dots and dashes", "Reverse and swap"]},
            {name: "Separator", type: "string", value: "/"}
        ],
        run: (input, args) => csMorseRun(input, args[0], args[1], false)
    },
    {
        name: "Morse Decode",
        group: GROUP,
        description: "Morse decoder: reads the chosen separator as a letter gap and a doubled separator as a word gap, then applies the same puzzle variant as the encoder.",
        args: [
            {name: "Variant", type: "option", value: ["Standard", "Reverse sequence", "Swap dots and dashes", "Reverse and swap"]},
            {name: "Separator", type: "string", value: "/"}
        ],
        run: (input, args) => csMorseRun(input, args[0], args[1], true)
    },
    {
        name: "UnMorse Decode",
        group: GROUP,
        description: "Run-on Morse decoder: with no separators every letter grouping is possible, so this ranks the plausible readings by English letter and n-gram frequency. Use the Digits bias for coordinate-like runs, or Best only for the top reading.",
        args: [
            {name: "Max results", type: "number", value: 10},
            {name: "Output", type: "option", value: ["Ranked list", "Best only"]},
            {name: "Bias", type: "option", value: ["English", "Digits"]}
        ],
        run: (input, args) => csUnmorseRun(input, args[0], args[1], args[2])
    },
    {
        name: "PLANET Barcode Encode",
        group: GROUP,
        description: "PLANET postal barcode: strips everything but digits, maps each digit to five short or tall bars, and frames the result with tall start and stop bars written as I.",
        args: [],
        run: (input) => csPlanetCodeRun(input, false)
    },
    {
        name: "PLANET Barcode Decode",
        group: GROUP,
        description: "PLANET barcode decoder: accepts i/I, . and |, or 0 and 1 as the two bar symbols, removes the frame and reads each five-bar group back to a digit.",
        args: [],
        run: (input) => csPlanetCodeRun(input, true)
    },
    {
        name: "POSTNET Barcode Encode",
        group: GROUP,
        description: "POSTNET postal barcode: keeps only digits, maps each one to the POSTNET five-bar pattern, and frames the barcode with tall I bars at both ends.",
        args: [],
        run: (input) => csPostnetCodeRun(input, false)
    },
    {
        name: "POSTNET Barcode Decode",
        group: GROUP,
        description: "POSTNET barcode decoder: normalises the two bar symbols, strips the start and stop bars and maps every five bars back to its digit. Non-digits are ignored.",
        args: [],
        run: (input) => csPostnetCodeRun(input, true)
    },
    {
        name: "Punycode Encode",
        group: GROUP,
        description: "Punycode (RFC 3492): converts each domain label containing a non-ASCII character to its xn-- form. ASCII labels are left alone and each line is handled separately.",
        args: [],
        run: (input) => csPunycodeRun(input, false)
    },
    {
        name: "Punycode Decode",
        group: GROUP,
        description: "Punycode decoder: converts every xn-- domain label back to Unicode. Labels without the prefix are left as they are; a bad label is reported on its own line.",
        args: [],
        run: (input) => csPunycodeRun(input, true)
    },
    {
        name: "TAPIR Substitution Encode",
        group: GROUP,
        description: "TAPIR substitution table: A, E, I, N and R use one digit, other letters use two, and 82 switches into digit and punctuation mode until 81. The digit stream is grouped in fives.",
        args: [],
        run: (input) => csTapirRun(input, false)
    },
    {
        name: "TAPIR Substitution Decode",
        group: GROUP,
        description: "TAPIR decoder: reads the digit stream two at a time, using the single-digit letters when needed and switching modes on 82 and 81. Unknown codes become question marks.",
        args: [],
        run: (input) => csTapirRun(input, true)
    },
    {
        name: "Tomtom Encode",
        group: GROUP,
        description: "Tomtom drum code: maps A-Z to slash and backslash patterns, from / for A through the longest pattern for Z, with a space between letters. Other characters are dropped.",
        args: [],
        run: (input) => csTomtomRun(input, false)
    },
    {
        name: "Tomtom Decode",
        group: GROUP,
        description: "Tomtom decoder: reads space-separated slash and backslash groups, matching the longest known pattern first. Unrecognised characters are passed through.",
        args: [],
        run: (input) => csTomtomRun(input, true)
    }
];

export const pairs = [
    {id: "abaddon", encode: "Abaddon Code Encode", decode: "Abaddon Code Decode", args: [], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ "},
    {id: "backslash", encode: "Backslash Code Encode", decode: "Backslash Code Decode", args: [], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {id: "chinese-code", encode: "Chinese Code Encode", decode: "Chinese Code Decode", args: [], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {id: "slash-pipe", encode: "Slash and Pipe Encode", decode: "Slash and Pipe Decode", args: [], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {id: "spirit-dvd", encode: "Spirit DVD Encode", decode: "Spirit DVD Decode", args: [], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {id: "decabit", encode: "Decabit Encode", decode: "Decabit Decode", args: [], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"},
    {id: "dtmf", encode: "DTMF Encode", decode: "DTMF Decode", args: [], sample: "0123456789ABCD*#"},
    {id: "quadoo", encode: "Quadoo Encode", decode: "Quadoo Decode", args: [], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"},
    {id: "seven-segment", encode: "Seven-Segment Display Encode", decode: "Seven-Segment Display Decode", args: [], sample: "ABC019"},
    {id: "letters-numbers", encode: "Letters to Numbers", decode: "Numbers to Letters", args: [], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {id: "dvorak", encode: "To Dvorak", decode: "To Qwerty", args: [], sample: "hello world"},
    {id: "qwerty-coordinates", encode: "Qwerty Coordinates Encode", decode: "Qwerty Coordinates Decode", args: [BASE_OPTIONS[0]], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"},
    {id: "qwerty-shifter", encode: "Qwerty Shifter Encode", decode: "Qwerty Shifter Decode", args: ["Right", 1, "A-Z and 0-9"], sample: "ABC xyz 123"},
    {id: "vanity", encode: "Vanity Encode", decode: "Vanity Decode", args: [VANITY_MODES[0]], sample: "ABCDEFGHIJKLMNOPQRSTUVWXYZ "},
    {id: "beghilos", encode: "Beghilos Encode", decode: "Beghilos Decode", args: [], sample: "BEGHILOS"},
    {id: "upside-down", encode: "Upside-Down Text Flip", decode: "Upside-Down Text Unflip", args: [], sample: "Hello"},
    {id: "zalgo", encode: "Zalgo Text Encode", decode: "Zalgo Text Decode", args: ["mild"], sample: "Zalgo"},
    {id: "spelling", encode: "Spelling Alphabet Encode", decode: "Spelling Alphabet Decode", args: [SPELLING_ALPHABETS[0]], sample: "ABC XYZ"},
    {id: "baudot", encode: "Baudot Encode", decode: "Baudot Decode", args: ["Baudot-Murray (ITA2)"], sample: "ABC 123"},
    {id: "goldbug", encode: "GoldBug Encode", decode: "GoldBug Decode", args: [], sample: "abc xyz"},
    {id: "hodor", encode: "Hodor Encode", decode: "Hodor Decode", args: [], sample: "abc"},
    {id: "nak", encode: "Nak Nak Encode", decode: "Nak Nak Decode", args: [], sample: "Hi"},
    {id: "navajo", encode: "Navajo Code Talkers Encode", decode: "Navajo Code Talkers Decode", args: [], sample: "AB"},
    {id: "tap-numbers", encode: "Tap / Knock Code Encode", decode: "Tap / Knock Code Decode", args: ["Numbers", "5 x 5 (A-Z, C/K)"], sample: "abc"},
    {id: "tap-dots", encode: "Tap / Knock Code Encode", decode: "Tap / Knock Code Decode", args: ["Dots", "5 x 5 (A-Z, C/K)"], sample: "abc"},
    {id: "brainfuck", encode: "Brainfuck & Ook! Encode", decode: "Brainfuck & Ook! Decode", args: ["Brainfuck"], sample: "Hello world"},
    {id: "ook", encode: "Brainfuck & Ook! Encode", decode: "Brainfuck & Ook! Decode", args: ["Ook!"], sample: "Hello world"},
    {id: "cow", encode: "Cow Encode", decode: "Cow Decode", args: [], sample: "Hello world"},
    {id: "number-pad-lines", encode: "Number Pad Lines Encode", decode: "Number Pad Lines Decode", args: [], sample: "geo42"},
    {id: "clock-code", encode: "Clock Code Encode", decode: "Clock Code Decode", args: [], sample: "abc xyz"},
    {id: "five-needle", encode: "Five Needle Telegraph Encode", decode: "Five Needle Telegraph Decode", args: [], sample: "ABDEF"},
    {id: "kenny", encode: "Kenny Encode", decode: "Kenny Decode", args: [], sample: "KENNY"},
    {id: "leet", encode: "Leet Encode", decode: "Leet Decode", args: ["Advanced"], sample: "LEET CODE"},
    {id: "morse", encode: "Morse Encode", decode: "Morse Decode", args: ["Standard", "/"], sample: "sos help"},
    {id: "morse-reverse", encode: "Morse Encode", decode: "Morse Decode", args: ["Reverse sequence", "/"], sample: "abc xyz"},
    {id: "morse-swap", encode: "Morse Encode", decode: "Morse Decode", args: ["Swap dots and dashes", "/"], sample: "abc xyz"},
    {id: "planet", encode: "PLANET Barcode Encode", decode: "PLANET Barcode Decode", args: [], sample: "12345"},
    {id: "postnet", encode: "POSTNET Barcode Encode", decode: "POSTNET Barcode Decode", args: [], sample: "12345"},
    {id: "punycode", encode: "Punycode Encode", decode: "Punycode Decode", args: [], sample: "café.example"},
    {id: "tapir", encode: "TAPIR Substitution Encode", decode: "TAPIR Substitution Decode", args: [], sample: "ABC 123"},
    {id: "tomtom", encode: "Tomtom Encode", decode: "Tomtom Decode", args: [], sample: "TOMTOM"}
];

export const checks = [
    {name: "Abaddon Code Encode", input: "ABC", args: {}, expected: "¥¥µ ¥þ¥ þµµ"},
    {name: "Abaddon Code Decode", input: "¥¥µ ¥þ¥ þµµ", args: {}, expected: "ABC"},
    {name: "Backslash Code Encode", input: "ABC", args: {}, expected: "|||||/||\\"},
    {name: "Backslash Code Decode", input: "|||||/||\\", args: {}, expected: "ABC"},
    {name: "Chinese Code Encode", input: "ABC", args: {}, expected: "- | |-"},
    {name: "Chinese Code Decode", input: "- | |-", args: {}, expected: "ABC"},
    {name: "Slash and Pipe Encode", input: "ABC", args: {}, expected: "| |\\ ||"},
    {name: "Slash and Pipe Decode", input: "| |\\ ||", args: {}, expected: "ABC"},
    {name: "Spirit DVD Encode", input: "ABC", args: {}, expected: "-|-|-|||-||-||-"},
    {name: "Spirit DVD Decode", input: "-|-|-|||-||-||-", args: {}, expected: "ABC"},
    {name: "Decabit Encode", input: "A", args: {}, expected: "++-+++----"},
    {name: "Decabit Decode", input: "++-+++----", args: {}, expected: "A"},
    {name: "DTMF Encode", input: "12", args: {}, expected: "697 1209 697 1336"},
    {name: "DTMF Decode", input: "697 1209 697 1336", args: {}, expected: "12"},
    {name: "Quadoo Encode", input: "ABC", args: {}, expected: "25 1235 35"},
    {name: "Quadoo Decode", input: "25 1235 35", args: {}, expected: "ABC"},
    {name: "Seven-Segment Display Encode", input: "ABC", args: {}, expected: "ABCEFG CDEFG ADEF"},
    {name: "Seven-Segment Display Decode", input: "ABCEFG CDEFG ADEF", args: {}, expected: "ABC"},
    {name: "Letters to Numbers", input: "ABC", args: {}, expected: "1 2 3"},
    {name: "Numbers to Letters", input: "1 2 3", args: {}, expected: "ABC"},
    {name: "To Dvorak", input: "hello", args: {}, expected: "d.nnr"},
    {name: "To Qwerty", input: "d.nnr", args: {}, expected: "hello"},
    {name: "Qwerty Coordinates Encode", input: "A", args: {"Start row": BASE_OPTIONS[0]}, expected: "22"},
    {name: "Qwerty Coordinates Decode", input: "22", args: {"Start row": BASE_OPTIONS[0]}, expected: "A"},
    {name: "Qwerty Shifter Encode", input: "ABC", args: {Direction: "Right", Amount: 1, Keyboard: "A-Z and 0-9"}, expected: "SNV"},
    {name: "Qwerty Shifter Decode", input: "SNV", args: {Direction: "Right", Amount: 1, Keyboard: "A-Z and 0-9"}, expected: "ABC"},
    {name: "Vanity Encode", input: "ABC", args: {Mode: VANITY_MODES[0]}, expected: "2 22 222"},
    {name: "Vanity Decode", input: "2 22 222", args: {Mode: VANITY_MODES[0]}, expected: "ABC"},
    {name: "Beghilos Encode", input: "BEGHILOS", args: {}, expected: "50714938"},
    {name: "Beghilos Decode", input: "07734", args: {}, expected: "HELLO"},
    {name: "Upside-Down Text Flip", input: "Hello", args: {}, expected: "ollǝH"},
    {name: "Upside-Down Text Unflip", input: "ollǝH", args: {}, expected: "Hello"},
    {name: "Zalgo Text Decode", input: "Z\u0301a\u0300l\u0308g\u0302o", args: {}, expected: "Zalgo"},
    {name: "Enclosed Areas", input: "B8", args: {"4": FOUR_OPTIONS[0]}, expected: "2 2\n\nGrand Total: 4"},
    {name: "Spelling Alphabet Encode", input: "ABC", args: {Alphabet: SPELLING_ALPHABETS[0]}, expected: "Alfa Bravo Charlie"},
    {name: "Spelling Alphabet Decode", input: "Alfa Bravo Charlie", args: {Alphabet: SPELLING_ALPHABETS[0]}, expected: "ABC"},
    {name: "Spelling Alphabet Decode", input: "Alpha Bravo Charlie (space) Juliet X-ray Yankee", args: {Alphabet: SPELLING_ALPHABETS[0]}, expected: "ABC JXY"},
    {name: "Spelling Alphabet Decode", input: "Hotel-Echo-Lima-Lima-Oscar", args: {Alphabet: SPELLING_ALPHABETS[0]}, expected: "HELLO"},
    {name: "Spelling Alphabet Decode", input: "Whisky Alfa Xray", args: {Alphabet: SPELLING_ALPHABETS[0]}, expected: "WAX"},
    {name: "Spelling Alphabet Decode", input: "Hotel Echo Lima Lima Oscar  Whiskey Oscar Romeo Lima Delta", args: {Alphabet: SPELLING_ALPHABETS[0]}, expected: "HELLO WORLD"},
    {name: "Baudot Encode", input: "ABC", args: {Variant: "Baudot-Murray (ITA2)"}, expected: "00011 11001 01110"},
    {name: "Baudot Decode", input: "00011 11001 01110", args: {Variant: "Baudot-Murray (ITA2)"}, expected: "ABC"},
    {name: "Baudot Encode", input: "AB", args: {Variant: "Baudot (ITA1)"}, expected: "00001 01100"},
    {name: "Baudot Decode", input: "00001 01100", args: {Variant: "Baudot (ITA1)"}, expected: "AB"},
    {name: "GoldBug Encode", input: "ABC", args: {}, expected: "52-"},
    {name: "GoldBug Decode", input: "52-", args: {}, expected: "abc"},
    {name: "Hodor Encode", input: "abc", args: {}, expected: "HODOR Hodor! hodor"},
    {name: "Hodor Decode", input: "HODOR Hodor! hodor", args: {}, expected: "abc"},
    {name: "Nak Nak Encode", input: "Hi", args: {}, expected: "Nak? Nak. Naknak Naknak."},
    {name: "Nak Nak Decode", input: "Nak? Nak. Naknak Naknak.", args: {}, expected: "Hi"},
    {name: "Navajo Code Talkers Encode", input: "AB", args: {}, expected: "Wol-La-Chee Shush"},
    {name: "Navajo Code Talkers Decode", input: "Wol-La-Chee Shush", args: {}, expected: "AB"},
    {name: "Navajo Code Talkers Encode", input: "A B", args: {}, expected: "Wol-La-Chee  Shush"},
    {name: "Navajo Code Talkers Decode", input: "Wol-La-Chee  Shush", args: {}, expected: "A B"},
    {name: "Tap / Knock Code Encode", input: "abc", args: {Format: "Numbers", Grid: "5 x 5 (A-Z, C/K)"}, expected: "11 12 13"},
    {name: "Tap / Knock Code Decode", input: "11 12 13", args: {Format: "Numbers", Grid: "5 x 5 (A-Z, C/K)"}, expected: "abc"},
    {name: "Tap / Knock Code Encode", input: "abc", args: {Format: "Dots", Grid: "5 x 5 (A-Z, C/K)"}, expected: ". .  . ..  . ..."},
    {name: "Tap / Knock Code Decode", input: ". .  . ..  . ...", args: {Format: "Dots", Grid: "5 x 5 (A-Z, C/K)"}, expected: "abc"},
    {name: "Brainfuck & Ook! Decode", input: "++++++++[>++++++++<-]>+.", args: {Mode: "Brainfuck"}, expected: "A"},
    {name: "Number Pad Lines Encode", input: "geo", args: {}, expected: "317965 3145479 71397"},
    {name: "Number Pad Lines Decode", input: "317965 3145479 71397", args: {}, expected: "geo"},
    {name: "Clock Code Encode", input: "ABC", args: {}, expected: "AM:1:2"},
    {name: "Clock Code Decode", input: "AM:1:2", args: {}, expected: "abc"},
    {name: "Five Needle Telegraph Encode", input: "AB", args: {}, expected: "/|||\\ /||\\|"},
    {name: "Five Needle Telegraph Decode", input: "/|||\\ /||\\|", args: {}, expected: "AB"},
    {name: "Kenny Encode", input: "ABC", args: {}, expected: "mmmmmpmmf"},
    {name: "Kenny Decode", input: "mmmmmpmmf", args: {}, expected: "ABC"},
    {name: "Leet Encode", input: "LEET", args: {Style: "Advanced"}, expected: "|_337"},
    {name: "Leet Decode", input: "|_337", args: {}, expected: "LEET"},
    {name: "Morse Encode", input: "sos", args: {Variant: "Standard", Separator: "/"}, expected: ".../---/..."},
    {name: "Morse Decode", input: ".../---/...", args: {Variant: "Standard", Separator: "/"}, expected: "sos"},
    {name: "PLANET Barcode Encode", input: "0", args: {}, expected: "IiiIIII"},
    {name: "PLANET Barcode Decode", input: "IiiIIII", args: {}, expected: "0"},
    {name: "POSTNET Barcode Encode", input: "0", args: {}, expected: "IIIiiiI"},
    {name: "POSTNET Barcode Decode", input: "IIIiiiI", args: {}, expected: "0"},
    {name: "Punycode Encode", input: "café.example", args: {}, expected: "xn--caf-dma.example"},
    {name: "Punycode Decode", input: "xn--caf-dma.example", args: {}, expected: "café.example"},
    {name: "TAPIR Substitution Encode", input: "A", args: {}, expected: "0"},
    {name: "TAPIR Substitution Decode", input: "0", args: {}, expected: "A"},
    {name: "Tomtom Encode", input: "AB", args: {}, expected: "/ //"},
    {name: "Tomtom Decode", input: "/ //", args: {}, expected: "AB"},
    {name: "UnMorse Decode", input: ".", args: {"Max results": 10, Output: "Best only"}, expected: "e"}
];
