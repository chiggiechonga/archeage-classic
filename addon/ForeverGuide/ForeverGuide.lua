-- ForeverGuide: collects your character info and turns it into a code
-- you paste into the web helper. Type /fg in game.

local ADDON = ...
local FG = CreateFrame("Frame")
local snapshot = {}   -- questID -> title for everything currently in the log
local exportFrame

local function safe(fn, ...)
  if type(fn) ~= "function" then return nil end
  local ok, a, b, c, d, e, f, g, h = pcall(fn, ...)
  if ok then return a, b, c, d, e, f, g, h end
end

local function db()
  ForeverGuideDB = ForeverGuideDB or {}
  ForeverGuideDB.done = ForeverGuideDB.done or {}
  return ForeverGuideDB
end

---------------------------------------------------------------------------
-- quest log
---------------------------------------------------------------------------
local function readQuestLog()
  local list = {}
  local CQ = C_QuestLog
  if CQ and CQ.GetNumQuestLogEntries and CQ.GetInfo then
    local n = safe(CQ.GetNumQuestLogEntries) or 0
    for i = 1, n do
      local info = safe(CQ.GetInfo, i)
      if info and not info.isHeader and info.title then
        local complete = info.questID and safe(CQ.IsComplete, info.questID)
        list[#list + 1] = { id = info.questID or 0, t = info.title, l = info.level or 0, c = complete and 1 or 0 }
      end
    end
  end
  if #list == 0 and GetNumQuestLogEntries and GetQuestLogTitle then
    local n = safe(GetNumQuestLogEntries) or 0
    for i = 1, n do
      local title, level, _, isHeader, _, isComplete, _, questID = safe(GetQuestLogTitle, i)
      if title and not isHeader then
        list[#list + 1] = { id = questID or 0, t = title, l = level or 0,
          c = (isComplete == 1 or isComplete == true) and 1 or 0 }
      end
    end
  end
  return list
end

local function isFlaggedDone(id)
  if not id or id == 0 then return false end
  if C_QuestLog and C_QuestLog.IsQuestFlaggedCompleted then
    return safe(C_QuestLog.IsQuestFlaggedCompleted, id) and true or false
  end
  if IsQuestFlaggedCompleted then return safe(IsQuestFlaggedCompleted, id) and true or false end
  return false
end

local function titleFor(id)
  if snapshot[id] then return snapshot[id] end
  if C_QuestLog then
    local t = safe(C_QuestLog.GetTitleForQuestID, id)
    if t then return t end
    t = safe(C_QuestLog.GetQuestInfo, id)
    if t then return t end
  end
end

local function markDone(id, title)
  if not id or id == 0 then return end
  title = title or titleFor(id)
  if title then db().done[id] = title end
end

-- quests that leave the log and are flagged done = turned in
local function refreshSnapshot()
  local now = {}
  for _, q in ipairs(readQuestLog()) do
    if q.id and q.id ~= 0 then now[q.id] = q.t end
  end
  for id, t in pairs(snapshot) do
    if not now[id] and isFlaggedDone(id) then markDone(id, t) end
  end
  snapshot = now
end

---------------------------------------------------------------------------
-- character info
---------------------------------------------------------------------------
local function talentPoints()
  if UnitCharacterPoints then
    local p = safe(UnitCharacterPoints, "player")
    if type(p) == "number" then return p end
  end
  if GetUnspentTalentPoints then
    local p = safe(GetUnspentTalentPoints)
    if type(p) == "number" then return p end
  end
  return -1
end

local function freeBagSlots()
  local free, getFree = 0, (C_Container and C_Container.GetContainerNumFreeSlots) or GetContainerNumFreeSlots
  if not getFree then return -1 end
  for bag = 0, 4 do
    local n, family = safe(getFree, bag)
    if n and (family == 0 or family == nil) then free = free + n end
  end
  return free
end

local function gear()
  local list = {}
  for slot = 1, 19 do
    local link = GetInventoryItemLink("player", slot)
    if link then
      local name = link:match("%[(.-)%]")
      local id = tonumber(link:match("item:(%d+)") or 0)
      list[#list + 1] = { s = slot, id = id, n = name or "?" }
    end
  end
  return list
end

local function professions()
  local list = {}
  if GetNumSkillLines and GetSkillLineInfo then
    local n = safe(GetNumSkillLines) or 0
    for i = 1, n do
      local name, isHeader, _, rank, _, _, maxRank = safe(GetSkillLineInfo, i)
      if name and not isHeader and maxRank and maxRank > 1 then
        list[#list + 1] = { n = name, r = rank or 0, m = maxRank }
      end
    end
  elseif GetProfessions and GetProfessionInfo then
    local a, b, c, d, e = safe(GetProfessions)
    for _, idx in pairs({ a, b, c, d, e }) do
      if idx then
        local name, _, rank, maxRank = safe(GetProfessionInfo, idx)
        if name then list[#list + 1] = { n = name, r = rank or 0, m = maxRank or 0 } end
      end
    end
  end
  return list
end

local function position()
  if not (C_Map and C_Map.GetBestMapForUnit) then return 0, 0, 0 end
  local map = safe(C_Map.GetBestMapForUnit, "player")
  if not map then return 0, 0, 0 end
  local pos = safe(C_Map.GetPlayerMapPosition, map, "player")
  if pos and pos.GetXY then
    local x, y = pos:GetXY()
    return map, math.floor((x or 0) * 1000 + 0.5) / 10, math.floor((y or 0) * 1000 + 0.5) / 10
  end
  return map, 0, 0
end


---------------------------------------------------------------------------
-- AH prices for the potions tab (read from Auctionator or TSM if installed)
---------------------------------------------------------------------------
local PRICE_IDS = {
  [5634] = "Free Action Potion", [2459] = "Swiftness Potion", [3823] = "Lesser Invisibility Potion",
  [9172] = "Invisibility Potion", [3387] = "Limited Invulnerability Potion",
  [6370] = "Blackmouth Oil", [6358] = "Oily Blackmouth", [3820] = "Stranglekelp",
  [3371] = "Empty Vial", [3372] = "Leaded Vial", [8925] = "Crystal Vial",
  [2452] = "Swiftthistle", [2450] = "Briarthorn", [2453] = "Bruiseweed", [3818] = "Fadeleaf",
  [3355] = "Wild Steelbloom", [3369] = "Grave Moss", [3356] = "Kingsblood", [3357] = "Liferoot",
  [4625] = "Firebloom", [8845] = "Ghost Mushroom", [8838] = "Sungrass", [8839] = "Blindweed",
}
-- new Forever potions: item IDs unknown, so look them up by name
local PRICE_NAMES = { "Spellblasting Potion", "Frenzy Potion", "Disorienting Smog Potion",
  "Greater Spellblasting Potion", "Greater Frenzy Potion", "Caustic Smog Potion" }

local function linkFor(id)
  local getInfo = (C_Item and C_Item.GetItemInfo) or GetItemInfo
  local _, link = safe(getInfo, id)
  return link or ("item:" .. id)
end

local function good(p) return type(p) == "number" and p > 0 end

local function lookup(id)
  -- Auctioneer (Auc-Advanced)
  local AA = AucAdvanced and AucAdvanced.API
  if AA then
    local link = linkFor(id)
    local p = AA.GetMarketValue and safe(AA.GetMarketValue, link)
    if good(p) then return p, "Auctioneer" end
    p = AA.GetAlgorithmValue and safe(AA.GetAlgorithmValue, "Appraiser", link)
    if good(p) then return p, "Auctioneer" end
  end
  -- Auctionator
  local A = Auctionator and Auctionator.API and Auctionator.API.v1
  if A and A.GetAuctionPriceByItemID then
    local p = safe(A.GetAuctionPriceByItemID, "ForeverGuide", id)
    if good(p) then return p, "Auctionator" end
    if A.GetAuctionPriceByItemLink then
      p = safe(A.GetAuctionPriceByItemLink, "ForeverGuide", linkFor(id))
      if good(p) then return p, "Auctionator" end
    end
  end
  -- TSM
  if TSM_API and TSM_API.GetCustomPriceValue then
    for _, src in ipairs({ "DBMinBuyout", "DBMarket" }) do
      local p = safe(TSM_API.GetCustomPriceValue, src, "i:" .. id)
      if good(p) then return p, "TSM" end
    end
  end
  -- shared function several AH addons define
  if GetAuctionBuyout then
    local p = safe(GetAuctionBuyout, linkFor(id))
    if good(p) then return p, "AH addon" end
  end
end

-- which AH addons are loaded (for the chat message)
local function ahAddons()
  local found = {}
  if AucAdvanced then found[#found + 1] = "Auctioneer" end
  if Auctionator then found[#found + 1] = "Auctionator" end
  if TSM_API then found[#found + 1] = "TSM" end
  return found
end

-- ask the game to cache item info so links and names resolve on the first /fg
local function warmItems()
  if C_Item and C_Item.RequestLoadItemDataByID then
    for id in pairs(PRICE_IDS) do pcall(C_Item.RequestLoadItemDataByID, id) end
  end
end

local function idForName(name)
  local getInfo = (C_Item and C_Item.GetItemInfo) or GetItemInfo
  local _, link = safe(getInfo, name)
  return link and tonumber(link:match("item:(%d+)"))
end

local function ahPrices()
  local list, from = {}, nil
  for id, name in pairs(PRICE_IDS) do
    local p, src = lookup(id)
    if p then list[#list + 1] = { name, p }; from = from or src end
  end
  for _, name in ipairs(PRICE_NAMES) do
    local id = idForName(name)
    local p, src = id and lookup(id)
    if p then list[#list + 1] = { name, p }; from = from or src end
  end
  return list, from or ""
end

local function collect()
  refreshSnapshot()
  local name, realm = UnitFullName("player")
  local _, raceFile = UnitRace("player")
  local _, classFile = UnitClass("player")
  local map, x, y = position()
  local pr, prSrc = ahPrices()
  local done = {}
  for id, t in pairs(db().done) do done[#done + 1] = { id, t } end
  return {
    v = 1,
    t = time(),
    n = name or "?",
    r = realm or GetRealmName() or "",
    race = raceFile or "",
    cls = classFile or "",
    fac = UnitFactionGroup("player") or "",
    lv = UnitLevel("player") or 0,
    xp = UnitXP("player") or 0,
    xpm = UnitXPMax("player") or 0,
    rest = GetXPExhaustion() or 0,
    money = GetMoney() or 0,
    zone = GetRealZoneText() or GetZoneText() or "",
    sub = GetSubZoneText() or "",
    map = map, x = x, y = y,
    hs = GetBindLocation() or "",
    tp = talentPoints(),
    bag = freeBagSlots(),
    log = readQuestLog(),
    done = done,
    gear = gear(),
    prof = professions(),
    pr = pr,
    prs = prSrc,
  }
end

---------------------------------------------------------------------------
-- tiny JSON + base64 (no libraries needed)
---------------------------------------------------------------------------
local function jstr(s)
  return '"' .. tostring(s):gsub('[%c"\\]', function(c)
    if c == '"' then return '\\"' elseif c == "\\" then return "\\\\"
    elseif c == "\n" then return "\\n" else return string.format("\\u%04x", c:byte()) end
  end) .. '"'
end

local function json(v)
  local tv = type(v)
  if tv == "table" then
    local out = {}
    if v[1] ~= nil or next(v) == nil then
      for i = 1, #v do out[i] = json(v[i]) end
      return "[" .. table.concat(out, ",") .. "]"
    end
    for k, val in pairs(v) do out[#out + 1] = jstr(k) .. ":" .. json(val) end
    return "{" .. table.concat(out, ",") .. "}"
  elseif tv == "number" then
    local ok, out = pcall(function()
      if v ~= v or v == math.huge or v == -math.huge then return "0" end
      if math.floor(v) == v then return string.format("%d", v) end
      return string.format("%.2f", v)
    end)
    return ok and out or "0"
  elseif tv == "boolean" then return v and "true" or "false"
  elseif tv == "string" then return jstr(v) end
  return "null"
end

local B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local function b64(s)
  local out = {}
  for i = 1, #s, 3 do
    local a, b, c = s:byte(i, i + 2)
    local n = a * 65536 + (b or 0) * 256 + (c or 0)
    local c1 = math.floor(n / 262144) % 64
    local c2 = math.floor(n / 4096) % 64
    local c3 = math.floor(n / 64) % 64
    local c4 = n % 64
    out[#out + 1] = B64:sub(c1 + 1, c1 + 1) .. B64:sub(c2 + 1, c2 + 1)
      .. (b and B64:sub(c3 + 1, c3 + 1) or "=") .. (c and B64:sub(c4 + 1, c4 + 1) or "=")
  end
  return table.concat(out)
end

---------------------------------------------------------------------------
-- copy window
---------------------------------------------------------------------------
local function buildFrame()
  local f = CreateFrame("Frame", "ForeverGuideExport", UIParent, BackdropTemplateMixin and "BackdropTemplate" or nil)
  f:SetSize(480, 240)
  f:SetPoint("CENTER")
  f:SetFrameStrata("DIALOG")
  f:EnableMouse(true)
  f:SetMovable(true)
  f:RegisterForDrag("LeftButton")
  f:SetScript("OnDragStart", f.StartMoving)
  f:SetScript("OnDragStop", f.StopMovingOrSizing)
  if f.SetBackdrop then
    f:SetBackdrop({
      bgFile = "Interface\\DialogFrame\\UI-DialogBox-Background",
      edgeFile = "Interface\\DialogFrame\\UI-DialogBox-Border",
      tile = true, tileSize = 32, edgeSize = 32,
      insets = { left = 11, right = 12, top = 12, bottom = 11 },
    })
  end
  tinsert(UISpecialFrames, "ForeverGuideExport")

  local title = f:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
  title:SetPoint("TOP", 0, -18)
  title:SetText("ForeverGuide sync code")

  local hint = f:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
  hint:SetPoint("BOTTOM", 0, 20)
  hint:SetText("Ctrl+C to copy, then paste it on the web helper")

  local ok, sf = pcall(CreateFrame, "ScrollFrame", nil, f, "UIPanelScrollFrameTemplate")
  if not ok or not sf then sf = CreateFrame("ScrollFrame", nil, f, "ScrollFrameTemplate") end
  sf:SetPoint("TOPLEFT", 22, -44)
  sf:SetPoint("BOTTOMRIGHT", -38, 40)

  local eb = CreateFrame("EditBox", nil, sf)
  eb:SetMultiLine(true)
  eb:SetMaxLetters(0)
  eb:SetAutoFocus(false)
  eb:SetFontObject(ChatFontNormal)
  eb:SetWidth(410)
  eb:SetScript("OnEscapePressed", function() f:Hide() end)
  eb:SetScript("OnTextChanged", function(self, user)
    if user then self:SetText(f.code or ""); self:HighlightText() end
  end)
  eb:SetScript("OnEditFocusGained", function(self) self:HighlightText() end)
  sf:SetScrollChild(eb)
  f.eb = eb

  local close = CreateFrame("Button", nil, f, "UIPanelCloseButton")
  close:SetPoint("TOPRIGHT", -6, -6)
  return f
end

local function showExport()
  local data = collect()
  local code = "FG1:" .. b64(json(data))
  local n, addons = #data.pr, ahAddons()
  if n > 0 then
    print(("|cff7fd8ffForeverGuide|r grabbed %d AH prices from %s."):format(n, data.prs))
  elseif #addons > 0 then
    print(("|cff7fd8ffForeverGuide|r found %s but no prices yet. Open the AH and let it scan, then /fg again."):format(table.concat(addons, ", ")))
  else
    print("|cff7fd8ffForeverGuide|r no AH addon found (Auctioneer, Auctionator or TSM), so no prices this time.")
  end
  exportFrame = exportFrame or buildFrame()
  exportFrame.code = code
  exportFrame.eb:SetText(code)
  exportFrame:Show()
  exportFrame.eb:SetFocus()
  exportFrame.eb:HighlightText()
end

---------------------------------------------------------------------------
-- events + slash command
---------------------------------------------------------------------------
FG:RegisterEvent("ADDON_LOADED")
FG:RegisterEvent("PLAYER_LOGIN")
FG:RegisterEvent("QUEST_LOG_UPDATE")
pcall(FG.RegisterEvent, FG, "QUEST_TURNED_IN")

FG:SetScript("OnEvent", function(_, event, arg1)
  if event == "ADDON_LOADED" and arg1 == ADDON then
    db()
  elseif event == "PLAYER_LOGIN" then
    refreshSnapshot()
    warmItems()
    print("|cff7fd8ffForeverGuide|r loaded. Type |cfff2c14e/fg|r to get your sync code.")
  elseif event == "QUEST_TURNED_IN" then
    markDone(arg1)
  elseif event == "QUEST_LOG_UPDATE" then
    refreshSnapshot()
  end
end)

SLASH_FOREVERGUIDE1 = "/fg"
SLASH_FOREVERGUIDE2 = "/foreverguide"
SlashCmdList.FOREVERGUIDE = function(msg)
  msg = (msg or ""):lower()
  if msg == "reset" then
    ForeverGuideDB = nil
    db()
    print("|cff7fd8ffForeverGuide|r turned-in quest list cleared.")
  else
    showExport()
  end
end
