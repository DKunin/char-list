"use strict";

const CHAR =
    location.pathname.replace("simple", "").replace(/\//g, "") ||
    "cleric-ozmozis";

const abilityMap = {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Inteligence",
    wis: "Wisdom",
    cha: "Charisma"
};

Vue.filter("modificator", function(value) {
    return Math.floor((parseInt(value) - 10) / 2);
});

Vue.filter("abilityMod", function(value, proficiency) {
    return parseInt(value) + parseInt(proficiency);
});

Vue.filter("abilityfull", function(value) {
    return abilityMap[value];
});

new Vue({
    el: "#app",
    data() {
        return {
            char: { weapons: {}, HP: {}, abilities: {} },
            dialogOpen: false,
            dialogContents: {},
            onlyShowPrepeared: true
        };
    },
    mounted() {
        this.updateData();
    },
    methods: {
        sortByPrepearedness(spells, key) {
            if (this.onlyShowPrepeared && key !== "zeroLevel") {
                return spells.filter(singleSpell => singleSpell.prepeared);
            }

            return spells;
        },
        updateData() {
            const that = this;
            let url = "/sheet/" + CHAR;
            if (url.includes('new')) {
                url = "/generate"
            }
            fetch(url)
                .then(res => res.json())
                .then(char => {
                    that.char = char;
                });
        },
        closeDialog() {
            this.dialogOpen = false;
        },
        openSpell(name) {
            this.dialogOpen = true;
            console.log(name)
            fetch(`/spell/${escape(name)}`)
                .then(res => res.json())
                .then(body => {
                    this.dialogContents = body;
                });
        },
        handleChange() {
            fetch("/sheet/" + CHAR, {
                credentials: "omit",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify(this.char),
                method: "POST",
                mode: "cors"
            });
        },
        deleteInventoryItem(item) {
            this.char.inventory = this.char.inventory.filter(
                singleItem => singleItem !== item
            );
            this.handleChange();
        },
        handleAddInventory(event) {
            const newItem = event.target.value;
            this.char.inventory = this.char.inventory.concat([newItem]);
            this.handleChange();
        }
    },
    template: "#char",
    computed: {}
});
