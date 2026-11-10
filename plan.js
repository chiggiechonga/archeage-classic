/* How each stop is grouped on the page: in town → grab → do (by area, in order) → turn in → hold.
   Shared by both guides.
   "@Name"     = a checkbox row from the stop's quest list (matched by the start of its name;
                 "@A|B" tries A, then B, for rows that differ between the guides)
   plain text  = a numbered line you can tick (grab / turn-in lines auto-tick from your sync)
   k (kind): town, grab, do, turn, hold, dng, skip */
const PLAN={
s1:[
 {k:'grab',h:'Grab in Lakeshire',i:['Solomon\'s Law (Magistrate Solomon, town hall)','Blackrock Menace (Marshal Marris)','Shadow Magic','Howling in the Hills (skip if you already did it)','@What Comes Around','@Missing in Action · Blackrock Bounty']},
 {k:'do',h:'Do, in this order',i:['@A Watchful Eye','@Archmage Theocritus','@A Watchful Eye →','@Looking Further','@Shadow Magic','@Blackrock Menace','@Solomon\'s Law','@Theocritus\' Retrieval','@Howling in the Hills']},
 {k:'turn',h:'Back in Lakeshire: turn in',i:['@Solomon\'s Law ·','Howling in the Hills']},
 {k:'hold',h:'Hold for later',i:['@Morganth']}],
s2:[
 {k:'turn',h:'On the way: Tower of Azora',i:['@Theocritus\' Retrieval']},
 {k:'town',h:'In Stormwind',i:['@Train Lv 22','@Turn in library books','@Sell herbs']},
 {k:'grab',h:'Grab in Stormwind (for the Stockade)',i:['@The Color of Blood','@Quell the Uprising','@The Stockade Riots']},
 {k:'do',h:'Mage class quest',i:['@Investigate the Blue Recluse']}],
s3:[
 {k:'town',h:'In Darkshire',i:['@Set hearth']},
 {k:'grab',h:'Grab in Darkshire',i:['The Night Watch (Commander Althea Ebonlocke)','Seasoned Wolf Kabobs','Dusky Crab Cakes','Raven Hill','Ghost Hair Thread','@Crime and Punishment','@The Legend of Stalvan']},
 {k:'do',h:'Do, in this order',i:['@The Night Watch','@Ghost Hair Thread','@Eight-Legged Menaces','@Raven Hill','@Jitters\' Growling Gut','@Wolves at Our Heels','@Supplies from Darkshire','@Seasoned Wolf Kabobs','@Dusky Crab Cakes']},
 {k:'turn',h:'Back in Darkshire: turn in',i:['The Night Watch','Seasoned Wolf Kabobs','Dusky Crab Cakes','Supplies from Darkshire','Zombie Juice']},
 {k:'skip',h:'Skip',i:['@Look to the Stars']}],
s4:[
 {k:'dng',h:'Inside the Stockade',i:['@What Comes Around','@Crime and Punishment','@Quell the Uprising','@The Color of Blood','@The Stockade Riots']},
 {k:'turn',h:'Turn in',i:['@Turn in everything','Quell the Uprising (Warden Thelwater, right outside)','The Color of Blood (Nikova Raskol, Old Town)','The Stockade Riots (Warden Thelwater)','What Comes Around (Guard Berton, Lakeshire)','Crime and Punishment (Councilman Millstipe, Darkshire)']}],
s5:[
 {k:'do',h:'On the way: Loch Modan',i:['@Rumi of Gnomeregan','@Report to Mountaineer Rockgar','@Runes of the Sorcerer-Kings']},
 {k:'town',h:'In Menethil Harbor',i:['@Set hearth']},
 {k:'grab',h:'Grab in Menethil',i:['Daily Delivery','Young Crocolisk Skins','Claws from the Deep','Digging Through the Ooze','Apprentice\'s Duties','In Search of the Excavation Team (by the bridge)','@Lost in the Thicket Things']},
 {k:'do',h:'Do, in this order',i:['@Daily Delivery','@Digging Through the Ooze','@In Search of the Excavation Team','@Goaz Scrolls','@The Greenwarden','@Horrors in the Highland']},
 {k:'turn',h:'Back in Menethil: turn in',i:['@Apprentice\'s Duties','Daily Delivery','Young Crocolisk Skins','Claws from the Deep','Digging Through the Ooze','@Highland Hides']},
 {k:'skip',h:'Skip',i:['@Fall of Dun Modr']}],
s6:[
 {k:'town',h:'In Lakeshire',i:['@Fly Menethil']},
 {k:'grab',h:'Grab in Lakeshire',i:['@Songblade Search','Missing in Action, Blackrock Bounty, An Unwelcome Guest + WANTED: Lieutenant Fangore (if you aren\'t holding them already)']},
 {k:'do',h:'Do, in this order',i:['@Blackrock Bounty','@Missing in Action','@WANTED: Lieutenant Fangore']},
 {k:'turn',h:'Back in Lakeshire: turn in',i:['Missing in Action','Blackrock Bounty','An Unwelcome Guest','WANTED: Lieutenant Fangore']},
 {k:'town',h:'Then go train',i:['@Train Lv 24']},
 {k:'skip',h:'Skip',i:['@Tharil\'zun']}],
s8:[
 {k:'dng',h:'Inside the Excavation Site',i:['@Songblade Search','@Lost in the Thicket Things','@Highland Hides','@Horrors in the Highland','@Lost Relic Carry']},
 {k:'turn',h:'Turn in',i:['@Turn in everything','Heartwoven (Caitlin Grassman, Menethil)','Highland Hides (James Halloran, Menethil)','Horrors in the Highland (Rethiel the Greenwarden)','Lost Relic Carry (Prospector Whelgar)','Songblade Search (Dorin Songblade, Lakeshire, next stop)']}],
s9:[
 {k:'town',h:'In Darkshire',i:['@Set hearth']},
 {k:'grab',h:'Grab in Darkshire',i:['The Night Watch, part 2 (Commander Althea Ebonlocke)','Worgen in the Woods','The Legend of Stalvan (if you\'re holding it)']},
 {k:'do',h:'Do, in this order',i:['@Sven\'s Camp','@Proving Your Worth','@Raven Hill skeletons','@Crimes Against Anatomy','@Ghoulish Effigy','@Worgen in the Woods','@The Night Watch (part 2)']},
 {k:'turn',h:'Back in Darkshire: turn in',i:['The Night Watch','Worgen in the Woods','Ogre Thieves','Zombie Juice']},
 {k:'town',h:'Stormwind trip',i:['@The Legend of Stalvan','@Train Lv 28','@Turn in library books']},
 {k:'do',h:'Redridge trip',i:['@Morganth','@Songblade Search']},
 {k:'hold',h:'Only with a group',i:['@Mor\'Ladim']}],
s10:[
 {k:'town',h:'In Menethil Harbor',i:['@Set hearth','@The Doomed Fleet']},
 {k:'grab',h:'Grab',i:['The Search Continues (after Reclaiming Goods)','The Cursed Crew','Ormer\'s Revenge, part 2 (Prospector Whelgar)']},
 {k:'do',h:'Do, in this order',i:['@Reclaiming Goods','@The Cursed Crew','@Ormer\'s Revenge','@Uncovering the Past']},
 {k:'turn',h:'Back in Menethil: turn in',i:['Return the Statuette','Lifting the Curse']},
 {k:'hold',h:'Only with a group',i:['@The Dark Iron War']},
 {k:'skip',h:'Skip',i:['@Fall of Dun Modr']}],
s11:[
 {k:'do',h:'On the way: Darkshore',i:['@Boat to Auberdine|Teleport to Darnassus','@Nar\'thalas Almanac']},
 {k:'town',h:'In Astranaar',i:['@Set hearth']},
 {k:'grab',h:'Grab in Astranaar',i:['Raene\'s Cleansing (Raene Wolfrunner)','Fallen Sky Lake','Answered Questions']},
 {k:'do',h:'Do, in this order',i:['@Raene\'s Cleansing','@Fallen Sky Lake','@The Branch of Cenarius','@Gleaming Crescent','@Ruuzel']},
 {k:'dng',h:'Dungeon',i:['@Blackfathom Deeps']},
 {k:'skip',h:'Stay away',i:['@Horde camps']}],
s12:[
 {k:'do',h:'The Barrens (heading south)',i:['@Arcanic Systems Manual','@Ride to Ratchet','@Baxtan','@Cozy Sleeping Bag · step 2']},
 {k:'do',h:'Thousand Needles',i:['@Lonebrow\'s Journal','@Shimmering Flats','@Geomancy','@Packaged Pristine Pelts','@Goblin Sponsorship']},
 {k:'town',h:'Over to Booty Bay',i:['@Boat to Booty Bay','@Expert Fishing book']},
 {k:'hold',h:'Grab + hold for Stranglethorn',i:['@Booty Bay quests']}],
s13:[
 {k:'town',h:'Stormwind + Ironforge errands',i:['@The Missing Diplomat','@Turn in library books','@A King\'s Tribute']},
 {k:'do',h:'On the way north',i:['@MacKreel\'s Moonshine']},
 {k:'town',h:'In Southshore',i:['@Set hearth','@Southshore quests']},
 {k:'do',h:'Alterac Mountains',i:['@Strahnbrad Mystery','@Defensive Magics 101']},
 {k:'dng',h:'Dungeon',i:['@City of Dalaran']},
 {k:'hold',h:'Hold for later',i:['@Hints of a New Plague']}],
s14:[
 {k:'do',h:'North: Rebel Camp',i:['@Rebel Camp quests','@Kurzen\'s Compound','@Return to Corporal Kaleb']},
 {k:'do',h:'Middle: Nesingwary',i:['@Nesingwary\'s Expedition','@Basilisks']},
 {k:'turn',h:'South: Booty Bay',i:['@Booty Bay turn-ins','@Water Elementals']},
 {k:'dng',h:'Dungeon',i:['@The Drowned City']},
 {k:'hold',h:'Hold for later',i:['@The Curse of the Tides']}],
s15:[
 {k:'do',h:'On the way: Theramore + Stonetalon',i:['@Boat Menethil','@Fury of the Land','@Cozy Sleeping Bag · step 3','@Cozy Sleeping Bag · step 4','@Stonetalon Peak']},
 {k:'town',h:'In Nijel\'s Point',i:['@Set hearth']},
 {k:'grab',h:'Grab in Nijel\'s Point',i:['Reagents for Reclaimers Inc.','Centaur Bounty','Vahlarriel\'s Search']},
 {k:'do',h:'Do, in this order',i:['@Reagents for Reclaimers','@Sceptre of Light','@The Karnitol Shipwreck','@Kodo Roundup','@Demons and You','@Shen\'dralas']},
 {k:'turn',h:'Back in Nijel\'s Point: turn in',i:['Reagents for Reclaimers Inc.','Centaur Bounty','Return to Vahlarriel']},
 {k:'dng',h:'Later',i:['@Maraudon']}],
s16:[
 {k:'town',h:'In Ironforge',i:['@Train Lv 40','@Dual spec','@Archmage Antonidas']},
 {k:'town',h:'Get your mount',i:['@Riding + your first','@Bind your mount','@Re-import naowh']},
 {k:'do',h:'First ride: sleeping bag run',i:['@Cozy Sleeping Bag · step 5','@Cozy Sleeping Bag · step 6','@A Web of Lies','@Cozy Sleeping Bag · step 7']}],
s17:[
 {k:'town',h:'In Theramore',i:['@Set hearth','@The Missing Diplomat']},
 {k:'grab',h:'Grab in Theramore',i:['Mudrock Soup and Bugs','Captain Vimes','The Black Shield','Lieutenant Paval Reethe']},
 {k:'do',h:'Do, in this order',i:['@Theramore quests','@Jarl Needs a Blade','@Hungry!','@RwlRwlRwlRwl!','@Stinky\'s Escape']},
 {k:'hold',h:'Hold for later',i:['@I See Alcaz Island']},
 {k:'town',h:'Next time you\'re in a city',i:['@Train Lv 42']}],
s18:[
 {k:'do',h:'The Riverglades',i:['@Get there','@Do every quest you see']},
 {k:'dng',h:'Dungeon',i:['@Krol\'Dok']}],
s19:[
 {k:'grab',h:'Grab in the Badlands camps',i:['A Dwarf and His Tools','Find Agmond','Barbecued Buzzard Wings','Pearl Diving']},
 {k:'do',h:'Do, in this order',i:['@A Dwarf and His Tools','@Barbecued Buzzard Wings','@Scrounging','@Pearl Diving','@Mummies']},
 {k:'dng',h:'Dungeon',i:['@Uldaman quests']}],
s20:[
 {k:'town',h:'In Booty Bay',i:['@Set hearth']},
 {k:'grab',h:'Grab in Booty Bay',i:['The Bloodsail Buccaneers','Akiris by the Bundle','Keep An Eye Out','Stranglethorn Fever']},
 {k:'do',h:'Do, in this order',i:['@Nesingwary Mastery','@The Bloodsail Buccaneers','@Akiris by the Bundle','@Partial Mystical Notes','@Mai\'Zoth','@The Curse of the Tides','@Green Hills']},
 {k:'dng',h:'Next',i:['@Zul\'Farrak']}],
s21:[
 {k:'town',h:'In Gadgetzan',i:['@Set hearth']},
 {k:'grab',h:'Grab in Gadgetzan',i:['Wastewander Justice','Water Pouch Bounty','Southsea Shakedown','Gahz\'ridian','Tooga\'s Quest','The Dunemaul Compound','Divino-matic Rod (for Zul\'Farrak)']},
 {k:'do',h:'Tanaris, in this order',i:['@Wastewander Justice','@Legends of the Tidesages','@Gahz\'ridian']},
 {k:'dng',h:'Dungeon',i:['@Zul\'Farrak']},
 {k:'do',h:'Feralas',i:['@Feathermoon','@Rescue OOX-22']},
 {k:'dng',h:'Later',i:['@Dire Maul']}],
s22:[
 {k:'town',h:'In Aerie Peak',i:['@Gryphon Master Talonaxe']},
 {k:'do',h:'Do, in this order',i:['@Troll Necklace Bounty','@The Altar of Zul','@Venomous Journeys','@Rescue OOX-09']},
 {k:'hold',h:'Only with a group',i:['@Saving Sharpbeak']},
 {k:'dng',h:'Dungeon',i:['@Alcaz Island']}],
s23:[
 {k:'do',h:'Searing Gorge',i:['@Searing Gorge quests','@A Mind of Metal']},
 {k:'do',h:'Blasted Lands',i:['@Blasted Lands buff','@Conjurer\'s Codex']},
 {k:'dng',h:'Dungeons',i:['@Sunken Temple','@Sanguine Sorcery','@Blackrock Depths']}],
s24:[
 {k:'do',h:'Felwood',i:['@Timbermaw Ally','@Northern Kalimdor','@Cleansing Felwood','@Corrupted plants']},
 {k:'do',h:'Azshara',i:['@Azshara quests','@Everyday Etiquette']},
 {k:'dng',h:'Dungeon',i:['@Blackmaw Hold']}],
s25:[
 {k:'grab',h:'Grab in Morgan\'s Vigil',i:['Extinguish the Firegut','Ogre Head On A Stick = Party','Gor\'tesh the Brute Lord','Lower Blackrock Spire quests']},
 {k:'do',h:'Do, in this order',i:['@Extinguish the Firegut','@Gor\'tesh','@Libram quests']},
 {k:'dng',h:'Blackrock Mountain',i:['@Magma or Lava','@Lower Blackrock Spire']}],
s26:[
 {k:'grab',h:'Grab in Chillwind Camp',i:['The Scourge Cauldrons','Argent Dawn Commission']},
 {k:'do',h:'Do, in this order',i:['@The Scourge Cauldrons','@Undead Potatoes','@Locked Away','@A Matter of Time','@Glyphed Oaken Branch','@Argent Dawn Commission']},
 {k:'dng',h:'Dungeon',i:['@Scholomance','@Necromancy 101']}],
s27:[
 {k:'grab',h:'Grab in Marshal\'s Refuge',i:['Crystal Pylons','Bloodpetal Sprouts','Beware of Pterrordax']},
 {k:'do',h:'Do, in this order',i:['@Marshal\'s Refuge quests','@Linken chain','@Collect power crystals']},
 {k:'dng',h:'Dungeon',i:['@Shaper\'s Terrace']}],
s28:[
 {k:'grab',h:'Grab in Everlook',i:['Winterfall Firewater','Threat of the Winterfall','Are We There, Yeti?']},
 {k:'do',h:'Do, in this order',i:['@Winterfall Firewater','@Ka-Boom!','@The Ruins of Kel\'Theril','@Strange Sources']},
 {k:'hold',h:'Only with a group',i:['@High Chief Winterfall']}],
s29:[
 {k:'town',h:'At Light\'s Hope Chapel',i:['@A Study of the Light']},
 {k:'do',h:'Do, in this order',i:['@Darrowshire chain','@Demon Dogs','@Hameya\'s Plea','@The Knight and the Lady','@Scourge: Undead Menace']},
 {k:'dng',h:'Dungeon',i:['@Stratholme']},
 {k:'town',h:'Ding!',i:['@DING 60']}]
};
