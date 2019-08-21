"use strict";

const PORT = 5005;
const bodyParser = require("body-parser");
const express = require("express");
const fs = require("fs");
const path = require("path");
const util = require("util");
const anyjson = require("any-json");
const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const spells = require("./public/js/spells");
const weapons = require("./public/js/weapons");
const names = require("./public/js/names");
const traits = require("./public/js/traits");
const Fuse = require("fuse.js");
var Chance = require("chance");
var chance = new Chance();

var searchOptions = {
	shouldSort: true,
	distance: 0,
	threshold: 0,
	tokenize: false,
	keys: [
		{
			name: "name",
			weight: 1
		}
	]
};
const fuse = new Fuse(spells.spellsData, searchOptions);

app.get("/sheet/:character", (req, res) => {
	readFile(`./public/sheets/${req.params.character}.yaml`)
		.then(result => result.toString())
		.then(async result => {
			const char = await anyjson.decode(result, "yaml");
			res.json(char);
		});
});

function rollAbilityScore() {
	const roll = chance.rpg("4d6");
	const dropLowest = roll
		.sort()
		.reverse()
		.slice(0, 3)
		.reduce((singleVal, summ) => {
			return (summ += singleVal);
		}, 0);
	return dropLowest;
}

function modificator(value) {
	return Math.floor((value - 10) / 2);
}

app.get("/generate", (req, res) => {
	const level = chance.integer({ min: 1, max: 4 });
	const spellsList = new Array(level).fill(1).map((single,index) => ({level: index, name:`level${index}`}));
	console.log(spellsList);
	const charSpells = spellsList.reduce((newSpells, singleItem) => {
		if (singleItem.level === undefined) return newSpells;
		
		newSpells[singleItem.name] = [...chance.pickset(spells.spellsData.filter(singleSpell => singleSpell.level <= singleItem.level), chance.integer({ min: 1, max: 2 }))]
		
		return newSpells;
	}, {});
	console.log(charSpells);

	const abilities = {
		str: rollAbilityScore(),
		dex: rollAbilityScore(),
		con: rollAbilityScore(),
		int: rollAbilityScore(),
		wis: rollAbilityScore(),
		cha: rollAbilityScore()
	};
	const proficiency = 2;
	const hitDice = 'd8';
	const char = {
		name: chance.pickone(names),
		level,
		race: chance.pickone(traits.race),
		profession: chance.pickone(traits.profession),
		sex: chance.pickone(['male', 'female']),
		alignment: chance.pickone(["LG", "LE", "LN", "TN", "NG", "NE", "CG", "CE", "CN"]),
		AC: chance.integer({ min: 10, max: 18 }),
		HP: {
			max: chance.rpg(level + hitDice, { sum : true }) + modificator(abilities.con) * level
		},
		speed: 30,
		proficiency,
		hitDice,
		abilities,
		spellcastingAbility: chance.pickone(["wis", "int", "cha"]),
		weapons: {
			equipped: [chance.pickone(weapons)]
		},
		spells: charSpells,
		mannerisms: chance.pickone(traits.mannerisms),
		traits: chance.pickone(traits.traits),
		// personalityTrait: "Nothing can shake my optimism",
		// ideals: "I trust my deity will guide my actions, Sigarda",
		// bonds: "Everything I do is for common people",
		// flaws: "Once I pick a goal, I become opsessed with it"
	};
	res.json(char);
});

app.get("/spell/:name", (req, res) => {
	res.json(fuse.search(req.params.name.toLowerCase())[0]);
});

app.post("/sheet/:character", async (req, res) => {
	readFile(`./public/sheets/${req.params.character}.yaml`)
		.then(result => result.toString())
		.then(async result => {
			const char = await anyjson.decode(result, "yaml");
			const newChar = Object.assign({}, char, req.body);
			const newCharSheet = await anyjson.encode(newChar, "yaml");
			await writeFile(
				`./public/sheets/${req.params.character}.yaml`,
				newCharSheet
			);
			res.json(newChar);
		});
});

app.get("/simple/:sheet", function(req, res) {
	res.sendFile(path.join(__dirname + "/public/simpler-index.html"));
});

app.get("/:sheet", function(req, res) {
	res.sendFile(path.join(__dirname + "/public/index.html"));
});

app.listen(PORT, () => console.log("Server started on port " + PORT));
