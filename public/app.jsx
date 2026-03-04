// Global API setup
let AUTH_TOKEN = localStorage.getItem("cmc_token") || null;
const { useState, useMemo, useCallback, useEffect } = React;

const api = {
  async get(url) {
    const r = await fetch(url, { headers: { Authorization: "Bearer " + AUTH_TOKEN } });
    if (!r.ok) throw await r.json();
    return r.json();
  },
  async post(url, data) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + AUTH_TOKEN },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw await r.json();
    return r.json();
  },
  async put(url, data) {
    const r = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + AUTH_TOKEN },
      body: JSON.stringify(data)
    });
    if (!r.ok) throw await r.json();
    return r.json();
  },
};

// ── Weight factors per bar size (lb/ft) ──
const WEIGHT_FACTORS = { "#3": 0.376, "#4": 0.668, "#5": 1.043, "#6": 1.502, "#7": 2.044, "#8": 2.670 };

function calcTons(feet, inches, pcsPerBundle, numBundles, barSize) {
  const len = feet + inches / 12;
  const wf = WEIGHT_FACTORS[barSize] || 0;
  return (len * pcsPerBundle * numBundles * wf) / 2000;
}

// ── Line type presets (4a-4c) ──
const LINE_TYPES = {
  longitudinal: { label: "#6 Longitudinal", barSize: "#6", lengths: [40, 60], minPcs: 18, maxPcs: 72, pcsMode: "range", defaultFeet: 60, defaultPcs: 30 },
  transverse: { label: "#5 Transverse", barSize: "#5", lengths: null, pcsMode: "fixed", fixedPcs: [51, 99], defaultFeet: 11, defaultInches: 8, defaultPcs: 99 },
  singlepiece: { label: "#6 Single Piece Tie Bar", barSize: "#6", lengths: null, pcsMode: "fixed", fixedPcs: [51, 99], defaultFeet: 4, defaultInches: 2, defaultPcs: 99 },
  other: { label: "Other (Non-Standard)", barSize: "#6", lengths: null, pcsMode: "free", defaultFeet: 60, defaultPcs: 30 },
};

// ── Project Directory (seeded from Excel) ──
const PROJECT_DIRECTORY = [
  { customer: "James Construction", gc: "", jobNumber: "1200P1001", projectName: "Webb Co US59 0086-14-075" },
  { customer: "SEMA Construction", gc: "", jobNumber: "1200P1005", projectName: "Grayson Co US75 0047-18-089" },
  { customer: "Royal Rebar", gc: "Webber", jobNumber: "1200P1008", projectName: "Guadalupe Co IH10 0535-01-074" },
  { customer: "Tom-Mac Inc", gc: "", jobNumber: "1200P1009", projectName: "Ft Bend Co Chimney Rock" },
  { customer: "O Trevino Construction", gc: "", jobNumber: "1200P1012", projectName: "Wheeler Co IH40 6451-25-001" },
  { customer: "Royal Rebar", gc: "Williams Brothers", jobNumber: "1200P1014", projectName: "Hunt Co IH30 0009-13-168 (WB JOB 542)" },
  { customer: "Texas Toro Bravo Const", gc: "Webber", jobNumber: "1200P1015", projectName: "Lubbock Co IH27 0067-07-094" },
  { customer: "Mesa Rodbusters", gc: "Williams Brothers", jobNumber: "1200P1016", projectName: "Wharton Co US59 0089-07-154 (WB JOB 543)" },
  { customer: "Texas Toro Bravo Const", gc: "SEMA", jobNumber: "1200P1018", projectName: "Grayson Co US75 0047-18-089" },
  { customer: "Royal Rebar", gc: "NEX Lonestar Constructors", jobNumber: "1200P1019", projectName: "Bexar Co I35 NEX S 0017-10-168" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1020", projectName: "Collin  Co US75 0047-14-053" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1023", projectName: "Fields West Frisco" },
  { customer: "Flatiron Constructors", gc: "", jobNumber: "1200P1024", projectName: "Ellis Co IH 35E 0442-03-042" },
  { customer: "Sundt Construction", gc: "", jobNumber: "1200P1025", projectName: "City of Ft Worth Cromwell Marine Crk Rd" },
  { customer: "Aranda Brothers Construction", gc: "", jobNumber: "1200P1027", projectName: "Montgomery Co Tamina Rd" },
  { customer: "Texas Toro Bravo Const", gc: "Mario Sinacola", jobNumber: "1200P1029", projectName: "NTTA-DNT Ext Seg 5 S" },
  { customer: "Sundt Construction", gc: "", jobNumber: "1200P1030", projectName: "Midland Co IH20 0005-14-094" },
  { customer: "Webber", gc: "", jobNumber: "1200P1032", projectName: "Randall Co IH27 0168-09-083" },
  { customer: "Texas Toro Bravo Const", gc: "Mario Sinacola", jobNumber: "1200P1034", projectName: "NTTA - DNT Seg 5 N" },
  { customer: "Harper Brothers Construction", gc: "", jobNumber: "1200P1035", projectName: "Fort Bend Co Westpark Tollway 0543-02-064" },
  { customer: "O Trevino Construction", gc: "", jobNumber: "1200P1036", projectName: "Dallas Co IH0030 6452-27-001" },
  { customer: "O Trevino Construction", gc: "", jobNumber: "1200P1037", projectName: "Dallas Co IH0030 6452-25-001" },
  { customer: "Tom-Mac Inc", gc: "", jobNumber: "1200P1038", projectName: "Fort Bend Co Beklnap Rd" },
  { customer: "Hermanos Steel LLC", gc: "James Construction", jobNumber: "1200P1039", projectName: "Bell Co SL 363 0320-06-008" },
  { customer: "Williams Brothers Const", gc: "Williams Brothers (Direct Contract)", jobNumber: "1200P1041", projectName: "Jefferson Co IH10 0028-13-135 (WB JOB 544)" },
  { customer: "Royal Rebar", gc: "Williams Brothers", jobNumber: "1200P1046", projectName: "Jefferson Co IH10 0028-13-135 (WB JOB 544)" },
  { customer: "Pulice Construction", gc: "", jobNumber: "1200P1053", projectName: "Colorado CO IH10 0271-01-083" },
  { customer: "Zachry Construction", gc: "", jobNumber: "1200P1057", projectName: "City of mesquite Faithon P Lucas Blvd" },
  { customer: "Webber", gc: "", jobNumber: "1200P1058", projectName: "Webb Co SH84 3483-02-002" },
  { customer: "Royal Rebar", gc: "SEMA", jobNumber: "1200P1061", projectName: "Denton Co IH35 0195-03-087" },
  { customer: "Texas Toro Bravo Const", gc: "Austin Zachry JV", jobNumber: "1200P1062", projectName: "Cooke Co IH35 0194-01-010 (north)" },
  { customer: "Tex-Braska Supply", gc: "", jobNumber: "1200P1064", projectName: "McLennan Co US84 0055-15-079" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1065", projectName: "John Hickman Frisco Station" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1069", projectName: "Tribute Marina @ Wynnewood Pk Ph1" },
  { customer: "Hermanos Steel LLC", gc: "Zachry", jobNumber: "1200P1074", projectName: "Parker Co IH20 0008-03-133" },
  { customer: "Zachry Construction", gc: "", jobNumber: "1200P1075", projectName: "Tarrant Co IH30 1068-01-214" },
  { customer: "Royal Rebar Inc", gc: "SEMA", jobNumber: "1200P1079", projectName: "Tarrant Co SH199 0171-04-050" },
  { customer: "Indus Road & Bridge", gc: "", jobNumber: "1200P1084", projectName: "Grayson Co US75 0047-18-088" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P1086", projectName: "Harris Co IH69 0027-13-200 (WB JOB 545)" },
  { customer: "IBCTX LLC", gc: "", jobNumber: "1200P1087", projectName: "City of Frisco-DAL Pkwy Ph5" },
  { customer: "Royal Rebar", gc: "Austin Bridge & Road", jobNumber: "1200P1088", projectName: "Dallas Co IH635 2374-02-162" },
  { customer: "Montalvo Bridge Systems LLC", gc: "", jobNumber: "1200P1089", projectName: "Montgomery Co SH105 0338-07-019" },
  { customer: "Texas Toro Bravo Const", gc: "Drake Companies", jobNumber: "1200P1090", projectName: "Bowie Co US82 0046-03-038" },
  { customer: "FNF Construction", gc: "", jobNumber: "1200P1091", projectName: "Nolan Co IH20 0006-03-121" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1093", projectName: "Fields Preserve Ph3" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1095", projectName: "Green Meadows Ph2B Celina" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1096", projectName: "Godwin Pkwy Prosper" },
  { customer: "RPM x Construction", gc: "", jobNumber: "1200P1097", projectName: "Grayson Co US75 0047-13-033" },
  { customer: "Royal Rebar", gc: "Zachry", jobNumber: "1200P1098", projectName: "Bexar Co IH410 0521-06-155" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1099", projectName: "Brookside North Ph 1,2 & 2B" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1100", projectName: "Mantua Point Ph 3A & 3B" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1101", projectName: "Pecan Sq Ph5A Northlake" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1102", projectName: "Fields West Seq1" },
  { customer: "ACEE Construction", gc: "", jobNumber: "1200P1104", projectName: "Webb Co El Pico Rd Widening & Paving" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1106", projectName: "Adeline @ the Tribute The Colonly" },
  { customer: "GK Constructors", gc: "", jobNumber: "1200P1110", projectName: "Travis Co IH35 0015-13-428" },
  { customer: "IBCTX LLC", gc: "", jobNumber: "1200P1112", projectName: "Dallas Co IH 35# 0442-02-16" },
  { customer: "Reliable Paving", gc: "", jobNumber: "1200P1113", projectName: "DFW Int Pkwy Ph 2" },
  { customer: "RPM x Construction", gc: "", jobNumber: "1200P1114", projectName: "Collin Co Park Blvd Ext" },
  { customer: "J Lee Milligan Inc", gc: "", jobNumber: "1200P1115", projectName: "Dallas co US54 0238-03-061" },
  { customer: "Hermanos Steel LLC", gc: "Webber", jobNumber: "1200P1116", projectName: "Collin Co SH5 0047-05-057" },
  { customer: "Webber", gc: "", jobNumber: "1200P1117", projectName: "Collin Co US380 0135-03-046" },
  { customer: "Royal Rebar", gc: "SEMA", jobNumber: "1200P1118", projectName: "Denton Co IH35E 0196-02-126" },
  { customer: "XEGR/RPM XCONSTRUCTION", gc: "", jobNumber: "1200P1119", projectName: "NTTA Chisholm Trl Pkwy Seg3" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1120", projectName: "Myrtle Crk Ph 2C & 2D" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1121", projectName: "Lakesong Ph 1-3" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1122", projectName: "Aster Park Ph2 P 166 McKinney" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1123", projectName: "Grand Oaks @ Green Meadows Ph 1A(P)" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1124", projectName: "Grand Oaks @ Green Meadows Ph 1B" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1125", projectName: "Karis Ph 2A Crowley" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1126", projectName: "Rolling Hills Arlington" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1127", projectName: "Stewart Farms Ph1 & 2 Glenn Heights" },
  { customer: "JB Pinnacle Group", gc: "", jobNumber: "1200P1130", projectName: "DART Hike & Bike Cotton Belt" },
  { customer: "Ed Bell Construction", gc: "", jobNumber: "1200P1131", projectName: "Parker Co R Williamson Memorial Hwy" },
  { customer: "Granite Construction Co", gc: "", jobNumber: "1200P1132", projectName: "Kaufman Co FM548 2588-01-022" },
  { customer: "Royal Rebar", gc: "James Construction", jobNumber: "1200P1133", projectName: "Galveston Co FM646 3049-01-022" },
  { customer: "Jordan Foster Construction", gc: "", jobNumber: "1200P1134", projectName: "Bastrop Co SH71 0265-03-043" },
  { customer: "Jordan Foster Construction", gc: "", jobNumber: "1200P1135", projectName: "Bexar Co US90 0024-07-059" },
  { customer: "McMahon Contracting", gc: "", jobNumber: "1200P1136", projectName: "City of Celina Coit Rd" },
  { customer: "O Trevino Construction", gc: "", jobNumber: "1200P1137", projectName: "Tarrant Co VA 0902-00-375" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1138", projectName: "Creekbend Ph 1 Celina" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1139", projectName: "Serenity Ph1 Princeton" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1140", projectName: "Legacy Gardens Ph3 & Frontier Pkwy" },
  { customer: "Posillico Civil Inc", gc: "", jobNumber: "1200P1141", projectName: "Galveston Co SH275 3595-01-022" },
  { customer: "Harper Brothers Construction", gc: "", jobNumber: "1200P1142", projectName: "Charger Way Bridge Westpark" },
  { customer: "Royal Rebar", gc: "Zachry", jobNumber: "1200P1143", projectName: "Denton Co IH35E 0196-01-109" },
  { customer: "Hunter Industries", gc: "", jobNumber: "1200P1144", projectName: "Lavaca Co UA90 0445-02-072" },
  { customer: "O Trevino Construction", gc: "", jobNumber: "1200P1145", projectName: "Collin Co SH289 0091-04-067" },
  { customer: "ACEE Construction", gc: "", jobNumber: "1200P1146", projectName: "Webb Co SH255 3586-02-007" },
  { customer: "Hermanos Steel LLC", gc: "", jobNumber: "1200P1148", projectName: "Chisholm Trail Pkwy Seg 3 05768-CTP-03-CN-PD" },
  { customer: "Longview Bridge & Road", gc: "", jobNumber: "1200P1149", projectName: "Gregg Co IH20 0495-07-081" },
  { customer: "Indus Road & Bridge", gc: "", jobNumber: "1200P1150", projectName: "Denton Co IH35 0195-02-081" },
  { customer: "Webber", gc: "", jobNumber: "1200P1151", projectName: "FBTRA Seg B3 & B4 101-1029" },
  { customer: "FNF Construction", gc: "", jobNumber: "1200P1152", projectName: "Hartley Co US87 0425-01-021" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1153", projectName: "Ten Mile Crk, Choate & Roseland Pkwy" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P1154", projectName: "North Fields Multifam Ph2" },
  { customer: "Urban Infraconstruction LLC", gc: "", jobNumber: "1200P1155", projectName: "City of Frisco Lebanon Rd Widening" },
  { customer: "Ed Bell Construction", gc: "", jobNumber: "1200P1156", projectName: "Montague Co US81 0013-05-067" },
  { customer: "O Trevino Construction", gc: "", jobNumber: "1200P1157", projectName: "McLennan Co VA 0909-00-105" },
  { customer: "O Trevino Construction", gc: "", jobNumber: "1200P1158", projectName: "Kaufman Co SS557 0495-01-082" },
  { customer: "Royal Rebar/Williams Bros", gc: "Williams Brothers", jobNumber: "1200P342", projectName: "TARRANT CO IH30 1068-02-076 (WB JOB 504)" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P446", projectName: "Waller CO - IH 10 (0271-04-071a) (WB JOB 514)" },
  { customer: "James Construction", gc: "", jobNumber: "1200P447", projectName: "Harris CO - MH Hempstead (8170-12-001)" },
  { customer: "Johnson Bros", gc: "", jobNumber: "1200P484", projectName: "Jefferson CO - IH 10 (0739-02-162)" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P491", projectName: "Galveston CO - IH 45 (0500-04-106) (WB JOB 519)" },
  { customer: "A & J Rebar LLC", gc: "Williams Brothers", jobNumber: "1200P566", projectName: "Galveston CO - IH 45 (0500-04-105)  (WB JOB 523)" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P591", projectName: "Wharton Co US 59 0089-08-098 (WB JOB 525)" },
  { customer: "Pulice Construction", gc: "", jobNumber: "1200P615", projectName: "Ft Bend Co SH36 0188-02-029" },
  { customer: "Pulice Construction", gc: "", jobNumber: "1200P617", projectName: "Brazoria Co SH36 0188-03-019" },
  { customer: "Texas Toro Bravo Const", gc: "Pegasus Link Constructors", jobNumber: "1200P618", projectName: "I635 LBJ Project" },
  { customer: "Texas Toro Bravo Const", gc: "Longview Bridge & Road", jobNumber: "1200P622", projectName: "Bowie Co IH30 0610-07-113" },
  { customer: "Zachry Construction", gc: "", jobNumber: "1200P627", projectName: "Bexar Co IH 10 Graytown Rd" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P632", projectName: "Orange CO IH10 0028-14-091 (WB JOB 526)" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P633", projectName: "Galveston Co IH45 0500-04-103 (WB JOB 527)" },
  { customer: "Longview Bridge & Road", gc: "", jobNumber: "1200P637", projectName: "Nacogdoches Co US59 0176-01-081" },
  { customer: "Gulf Coast Company", gc: "", jobNumber: "1200P639", projectName: "Harris CO FM1960 1685-03-058" },
  { customer: "Royal Rebar", gc: "Williams Brothers", jobNumber: "1200P670", projectName: "Galveston Co IH45 0500-01-107 (WB JOB 528)" },
  { customer: "Great Hills Constructors", gc: "", jobNumber: "1200P704", projectName: "Travis Co SH183 Design Build" },
  { customer: "Royal Rebar", gc: "Williams Brothers", jobNumber: "1200P711", projectName: "Bexar Co IH 410 0521-06-138 (WB JOB 529)" },
  { customer: "Breda Co", gc: "Colorado River Constructors", jobNumber: "1200P722", projectName: "Oak Hill Parkway" },
  { customer: "Williams Brothers Const", gc: "Williams Brothers (Direct Contract)", jobNumber: "1200P744", projectName: "Jefferson Co US69 0200-16-020 (WB JOB 532)" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P757", projectName: "Harris Co SH 146 0389-05-087 (WB JOB 531)" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P758", projectName: "Walker Co IH45 0675-07-097 (WB JOB 533)" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P762", projectName: "Jefferson Co US69 0200-16-020 (WB JOB 532)" },
  { customer: "Infrastructure Services", gc: "", jobNumber: "1200P789", projectName: "Harris Co SL8 3256-03-094" },
  { customer: "Webber", gc: "", jobNumber: "1200P796", projectName: "Guadalupe Co IH10 0025-03-097" },
  { customer: "Texas Toro Bravo Const", gc: "Longview Bridge & Road", jobNumber: "1200P806", projectName: "Titus Co US271 0221-05-065" },
  { customer: "Pulice Construction", gc: "", jobNumber: "1200P807", projectName: "HCRMA 365 Tollway Seg 1 & 2 0921-02-368" },
  { customer: "Williams Brothers Const", gc: "Williams Brothers (Direct Contract)", jobNumber: "1200P808", projectName: "Jefferson Co IH10 @ IH69 0739-02-140 (WB JOB 535)" },
  { customer: "Royal Rebar", gc: "Williams Brothers", jobNumber: "1200P809", projectName: "Jefferson Co IH10 0739-02-140 (WB JOB 535)" },
  { customer: "A & J Rebar LLC", gc: "", jobNumber: "1200P830", projectName: "Nacogdoches Co US59 0176-01-081-replaced 1200P585" },
  { customer: "Mesa Rod Busters", gc: "Williams Brothers", jobNumber: "1200P840", projectName: "Jefferson Co IH10 0739-02-161 (WB JOB 517)" },
  { customer: "KLP Commercial", gc: "Fluor", jobNumber: "1200P844", projectName: "Travis CO IH35 0015-13-077" },
  { customer: "Hermanos Steel LLC", gc: "Lonestar", jobNumber: "1200P847", projectName: "Dallas Co I35 E Ph2 0196-03-274 & 0196-03-282" },
  { customer: "Royal Rebar", gc: "Williams Brothers", jobNumber: "1200P872", projectName: "Bexar Co IH10 0072-08-144 (WB JOB 536)" },
  { customer: "Longview Bridge & Road", gc: "", jobNumber: "1200P873", projectName: "Angelina Co US 59 0176-02-118" },
  { customer: "Hermanos Steel LLC", gc: "Longview Bridge & Road", jobNumber: "1200P875", projectName: "Angelina Co US 59 0176-02-118" },
  { customer: "Webber", gc: "", jobNumber: "1200P878", projectName: "Collin Co FM2514 2679-03-015" },
  { customer: "James Construction", gc: "", jobNumber: "1200P879", projectName: "Polk Co US59 0176-04-056" },
  { customer: "Zachry Construction", gc: "", jobNumber: "1200P880", projectName: "Denton Co US380 0135-10-050" },
  { customer: "Texas Sterling", gc: "", jobNumber: "1200P881", projectName: "Collin Co SH205 0451-03-013" },
  { customer: "Webber", gc: "", jobNumber: "1200P882", projectName: "Brazoria Co SH36 0188-04-035" },
  { customer: "Webber", gc: "", jobNumber: "1200P884", projectName: "Denton Co IH35 0195-02-076" },
  { customer: "Pulice Construction", gc: "", jobNumber: "1200P891", projectName: "Travis Co IH35 0015-10-062" },
  { customer: "Williams Brothers Const", gc: "Williams Brothers (Direct Contract)", jobNumber: "1200P899", projectName: "Rockwall Co - IH30 0009-12-220 (WB JOB 537)" },
  { customer: "Altus Construction LLC", gc: "", jobNumber: "1200P905", projectName: "Midland Co BI 20-E 0005-03-068" },
  { customer: "KLP Commercial", gc: "Harper Brothers", jobNumber: "1200P910", projectName: "Hunt Co FM 2642 2658-01-013" },
  { customer: "KLP Commercial", gc: "Harper Brothers", jobNumber: "1200P911", projectName: "Collin Co SH5 0047-04-031" },
  { customer: "James Construction", gc: "", jobNumber: "1200P913", projectName: "Montgomery Co SH 105 0338-04-060" },
  { customer: "Hermanos Steel LLC", gc: "Kiewit", jobNumber: "1200P918", projectName: "Tarrant Co Southeast Connector" },
  { customer: "Webber", gc: "", jobNumber: "1200P919", projectName: "Fort Bend Co SH99 3510-04-019" },
  { customer: "CMC Construction Services", gc: "", jobNumber: "1200P924", projectName: "Galveston Co IH45 (1200P633 & 1200P670 Tie Bars)" },
  { customer: "Zachry Construction", gc: "", jobNumber: "1200P925", projectName: "Brazoria Co SH36 0188-06-046" },
  { customer: "Williams Brothers Const", gc: "Williams Brothers (Direct Contract)", jobNumber: "1200P930", projectName: "Harris Co SH35 0178-09-018 (WB JOB 539)" },
  { customer: "James Construction", gc: "", jobNumber: "1200P933", projectName: "Montgomery Co SH105 0338-04-066" },
  { customer: "Tex-Braska Supply", gc: "", jobNumber: "1200P938", projectName: "Denton Co IH35E 0196-02-128" },
  { customer: "O Trevino Construction", gc: "", jobNumber: "1200P940", projectName: "Potter Co IH40 6434-90-001" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P941", projectName: "Denton Co SH114 0353-02-037" },
  { customer: "Royal Rebar", gc: "Austin Bridge & Road", jobNumber: "1200P943", projectName: "Hunt Co IH30 0009-13-167" },
  { customer: "Texas Toro Bravo Const", gc: "Webber", jobNumber: "1200P945", projectName: "Tom Green Co SL378 0159-07-007" },
  { customer: "Mesa Rod Busters", gc: "Webber", jobNumber: "1200P946", projectName: "Fort Bend Co SH99 3510-04-019" },
  { customer: "Royal Rebar Inc", gc: "Williams Brothers", jobNumber: "1200P949", projectName: "Galveston Co SH146 0389-07-025 (WB JOB 540)" },
  { customer: "Infrastructure Services", gc: "", jobNumber: "1200P961", projectName: "Waller Co US290 0114-11-086" },
  { customer: "Longview Bridge & Road", gc: "", jobNumber: "1200P964", projectName: "Panola Co US59 0063-10-015" },
  { customer: "SEMA Construction", gc: "", jobNumber: "1200P967", projectName: "Parker Co IH20 0008-03-094" },
  { customer: "Ed Bell Construction", gc: "", jobNumber: "1200P970", projectName: "Collin Co FM1378 1392-01-044" },
  { customer: "Webber", gc: "", jobNumber: "1200P972", projectName: "Guadalupe Co IH10 0535-01-074" },
  { customer: "James Construction", gc: "", jobNumber: "1200P974", projectName: "Galveston Co SH146 0389-06-088" },
  { customer: "Main Lane Industries", gc: "", jobNumber: "1200P975", projectName: "Harris Co SH288 0598-01-105" },
  { customer: "Webber", gc: "", jobNumber: "1200P977", projectName: "Wharton Co US59 0089-06-092" },
  { customer: "Royal Rebar", gc: "SEMA", jobNumber: "1200P978", projectName: "Parker Co IH20 0008-03-094" },
  { customer: "Webber", gc: "", jobNumber: "1200P979", projectName: "San Jacinto Co US59 0177-02-057" },
  { customer: "Royal Rebar", gc: "Williams Brothers", jobNumber: "1200P981", projectName: "Rockwall Co IH30 0009-12-219 (WB JOB 541)" },
  { customer: "Sundt Construction Inc Tempe", gc: "", jobNumber: "1200P982", projectName: "City of Denton Bonnie Brae Ph3" },
  { customer: "Webber", gc: "", jobNumber: "1200P984", projectName: "Colorado Co IH10 0271-01-066" },
  { customer: "Mario Sinacola & Sons", gc: "", jobNumber: "1200P989", projectName: "Fields Brookside North Landon" },
  { customer: "Harper Brothers Construction", gc: "", jobNumber: "1200P992", projectName: "Collin Co FM 2551 2056-01-042" },
  { customer: "Balfour Beatty Infrastructure", gc: "", jobNumber: "1200P993", projectName: "Harris Co BU90-u 0028-01-067" },
  { customer: "SEMA Construction", gc: "", jobNumber: "1200P996", projectName: "Wise Co FM730 0312-04-022" },
];

// ── Status colors and labels ──
const STATUS_CONFIG = {
  submitted: { label: "Submitted", color: "#2563eb", bg: "#dbeafe" },
  processing: { label: "Processing", color: "#d97706", bg: "#fef3c7" },
  confirmed: { label: "Confirmed", color: "#059669", bg: "#d1fae5" },
  revision_requested: { label: "Revision Requested", color: "#7c3aed", bg: "#ede9fe" },
  revision_denied: { label: "Revision Denied", color: "#dc2626", bg: "#fee2e2" },
  delivered: { label: "Delivered", color: "#065f46", bg: "#a7f3d0" },
  issue_reported: { label: "Issue Reported", color: "#dc2626", bg: "#fee2e2" },
  issue_resolved: { label: "Issue Resolved", color: "#059669", bg: "#d1fae5" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#6b7280", bg: "#f3f4f6" };
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}22` }}>
      {cfg.label}
    </span>
  );
}

// ── Helpers ──
function getOrderTotalTons(lines) {
  return lines.reduce((sum, l) => sum + calcTons(l.feet, l.inches, l.pcsPerBundle, l.numBundles, l.barSize), 0);
}

function formatTons(t) { return t.toFixed(2); }
function formatDate(d) { return d ? new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""; }
function getJobShort(jobNumber) { return jobNumber.replace("1200", ""); }
function genId() { return "id_" + Math.random().toString(36).slice(2, 9); }

// ── UI Primitives ──
function Btn({ children, onClick, variant = "primary", small, style: extraStyle, disabled }) {
  const base = { border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, fontSize: small ? 12 : 14, padding: small ? "4px 10px" : "8px 16px", transition: "all 0.15s", opacity: disabled ? 0.5 : 1 };
  const variants = {
    primary: { background: "#1d4ed8", color: "#fff" },
    success: { background: "#059669", color: "#fff" },
    danger: { background: "#dc2626", color: "#fff" },
    outline: { background: "#fff", color: "#374151", border: "1px solid #d1d5db" },
    ghost: { background: "transparent", color: "#2563eb" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...extraStyle }} disabled={disabled}>{children}</button>;
}

function Input({ label, style: extraStyle, ...props }) {
  return (
    <div style={{ marginBottom: 8, ...extraStyle }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 3 }}>{label}</label>}
      <input style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} {...props} />
    </div>
  );
}

function Select({ label, children, style: extraStyle, ...props }) {
  return (
    <div style={{ marginBottom: 8, ...extraStyle }}>
      {label && <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 3 }}>{label}</label>}
      <select style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} {...props}>{children}</select>
    </div>
  );
}

// ── Toast notification ──
function Toast({ message, type, onClose }) {
  if (!message) return null;
  const colors = { success: { bg: "#d1fae5", border: "#059669", text: "#065f46" }, error: { bg: "#fee2e2", border: "#dc2626", text: "#991b1b" }, info: { bg: "#dbeafe", border: "#2563eb", text: "#1e40af" } };
  const c = colors[type] || colors.info;
  return (
    <div style={{ position: "fixed", top: 24, right: 24, zIndex: 2000, background: c.bg, border: `2px solid ${c.border}`, color: c.text, padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 12, maxWidth: 400 }}>
      <span>{type === "success" ? "\u2713" : type === "error" ? "\u2717" : "\u2139"}</span>
      <span>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", color: c.text, cursor: "pointer", fontSize: 18, padding: 0, marginLeft: 8 }}>x</button>
    </div>
  );
}

// ── Order Detail Panel ──
function OrderDetail({ order, isCmc, onUpdateOrder, cmcUserName, showToast }) {
  const [revisionReason, setRevisionReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [issueType, setIssueType] = useState("late");
  const [cmcResponse, setCmcResponse] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  // CMC Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLines, setProcessingLines] = useState([]);
  const [processingDate, setProcessingDate] = useState("");
  const [processingNote, setProcessingNote] = useState("");
  const [revisionDate, setRevisionDate] = useState("");

  const startProcessingMode = () => {
    setIsProcessing(true);
    setProcessingLines(order.lines.map(l => ({ ...l })));
    setProcessingDate(order.deliveryDate);
    setProcessingNote("");
  };

  const updateProcessingLine = (id, field, value) => {
    setProcessingLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const totalTons = getOrderTotalTons(order.lines);
  const estTruckloads = Math.ceil(totalTons / 22);

  return (
    <div style={{ padding: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Order {order.orderNumber}</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{order.jobName} ({order.jobNumber})</div>
          <div style={{ fontSize: 13, color: "#374151", marginTop: 2, fontWeight: 500 }}>Segment: {order.segment}</div>
          {isCmc && <div style={{ fontSize: 13, color: "#6b7280" }}>Customer: {order.customer}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <StatusBadge status={order.status} />
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Delivery: {formatDate(order.deliveryDate)}</div>
        </div>
      </div>

      <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Receiving Contact</div>
        <div>Primary: {order.contactName} - {order.contactPhone}</div>
        <div>Backup: {order.backupName} - {order.backupPhone}</div>
        {order.deliveryLocation && <div style={{ marginTop: 4 }}><a href={order.deliveryLocation} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>View Delivery Location on Map</a></div>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Line Items</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600 }}>Type</th>
                <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>Bar</th>
                <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>Length</th>
                <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>Pcs/Bdl</th>
                <th style={{ padding: "6px 8px", textAlign: "center", fontWeight: 600 }}># Bdls</th>
                <th style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>Tons</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map(l => (
                <tr key={l.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "6px 8px" }}>{LINE_TYPES[l.lineType]?.label || l.lineType}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{l.barSize}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{l.feet}'{l.inches > 0 ? ` ${l.inches}"` : ""}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{l.pcsPerBundle}</td>
                  <td style={{ padding: "6px 8px", textAlign: "center" }}>{l.numBundles}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{formatTons(calcTons(l.feet, l.inches, l.pcsPerBundle, l.numBundles, l.barSize))}</td>
                </tr>
              ))}
              <tr style={{ background: "#f0fdf4", fontWeight: 700 }}>
                <td colSpan={5} style={{ padding: "8px", textAlign: "right" }}>Total ({estTruckloads} est. truckload{estTruckloads > 1 ? "s" : ""})</td>
                <td style={{ padding: "8px", textAlign: "right" }}>{formatTons(totalTons)} T</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* History Timeline */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Order History</div>
        <div style={{ borderLeft: "2px solid #d1d5db", paddingLeft: 16 }}>
          {order.history.map((h, i) => (
            <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: "#374151" }}>{h.action}</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>{h.date} - {h.by}</div>
              {h.details && <div style={{ color: "#6b7280", fontSize: 12, fontStyle: "italic" }}>{h.details}</div>}
            </div>
          ))}
        </div>
      </div>

      {order.revisionRequests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Revision Requests</div>
          {order.revisionRequests.map((r, i) => (
            <div key={i} style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13 }}>
              <div><strong>Requested:</strong> {r.reason}</div>
              {r.newDate && <div>New date requested: {formatDate(r.newDate)}</div>}
              <div style={{ color: "#6b7280", fontSize: 12 }}>{r.date} by {r.by}</div>
              {r.response && <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #e9d5ff" }}><strong>CMC Response:</strong> {r.response}</div>}
            </div>
          ))}
        </div>
      )}

      {order.issues.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Issues</div>
          {order.issues.map((iss, i) => (
            <div key={i} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13 }}>
              <div><strong>{iss.type.toUpperCase()}:</strong> {iss.description}</div>
              <div style={{ color: "#6b7280", fontSize: 12 }}>{iss.date} by {iss.by}</div>
              {iss.response && <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #fecaca" }}><strong>CMC Response:</strong> {iss.response}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Customer Actions */}
      {!isCmc && order.status !== "delivered" && (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Actions</div>
          <div style={{ background: "#faf5ff", borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Request Revision</div>
            <Input label="New Delivery Date (optional)" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3 }}>Reason</label>
              <textarea style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, minHeight: 60, boxSizing: "border-box" }} value={revisionReason} onChange={e => setRevisionReason(e.target.value)} placeholder="Describe the change needed..." />
            </div>
            <Btn onClick={() => {
              if (!revisionReason.trim()) return;
              const updated = { ...order, status: "revision_requested",
                revisionRequests: [...order.revisionRequests, { reason: revisionReason, newDate, date: new Date().toISOString().slice(0, 10), by: order.customer }],
                history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: "Revision requested", by: order.customer, details: revisionReason }]
              };
              onUpdateOrder(updated);
              setRevisionReason(""); setNewDate("");
              showToast("Revision request submitted", "success");
            }} variant="primary" small disabled={!revisionReason.trim()}>Submit Revision Request</Btn>
          </div>
        </div>
      )}

      {!isCmc && (order.status === "delivered" || order.status === "issue_reported" || order.status === "issue_resolved") && (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Report Issue</div>
          <div style={{ background: "#fef2f2", borderRadius: 8, padding: 12 }}>
            <Select label="Issue Type" value={issueType} onChange={e => setIssueType(e.target.value)}>
              <option value="late">Late Delivery</option>
              <option value="wrong">Wrong Material</option>
              <option value="incomplete">Incomplete Order</option>
              <option value="damaged">Damaged Material</option>
              <option value="other">Other</option>
            </Select>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3 }}>Description</label>
              <textarea style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, minHeight: 60, boxSizing: "border-box" }} value={issueDesc} onChange={e => setIssueDesc(e.target.value)} placeholder="Describe the issue..." />
            </div>
            <Btn onClick={() => {
              if (!issueDesc.trim()) return;
              const updated = { ...order, status: "issue_reported",
                issues: [...order.issues, { type: issueType, description: issueDesc, date: new Date().toISOString().slice(0, 10), by: order.customer }],
                history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: `Issue reported: ${issueType}`, by: order.customer, details: issueDesc }]
              };
              onUpdateOrder(updated);
              setIssueDesc("");
              showToast("Issue reported", "success");
            }} variant="danger" small disabled={!issueDesc.trim()}>Report Issue</Btn>
          </div>
        </div>
      )}

      {/* CMC Actions */}
      {isCmc && (
        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>CMC Actions</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
            {!isProcessing && (
              <Btn onClick={startProcessingMode} variant="primary" small>
                {order.status === "submitted" ? "Start Processing" : "Edit / Revise Order"}
              </Btn>
            )}
            {(order.status === "submitted" || order.status === "processing") && !isProcessing && (
              <Btn onClick={() => {
                const updated = { ...order, status: "confirmed", history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: "Order confirmed by CMC (no changes)", by: cmcUserName }] };
                onUpdateOrder(updated);
                showToast("Order confirmed", "success");
              }} variant="success" small>Confirm As-Is</Btn>
            )}
            {order.status === "confirmed" && (() => {
              const today = new Date().toISOString().slice(0, 10);
              const canConfirmDelivery = today >= order.deliveryDate;
              return canConfirmDelivery ? (
                <Btn onClick={() => {
                  const updated = { ...order, status: "delivered", history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: "Delivery completed (manual confirmation)", by: cmcUserName }] };
                  onUpdateOrder(updated);
                  showToast("Delivery confirmed", "success");
                }} variant="success" small>Confirm Delivery</Btn>
              ) : (
                <span style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic", padding: "4px 0" }}>Delivery can be confirmed on or after {formatDate(order.deliveryDate)}</span>
              );
            })()}
            {order.status === "revision_requested" && (
              <>
                <Btn onClick={() => { setConfirmAction("approve_revision"); setRevisionDate(order.revisionRequests[order.revisionRequests.length - 1]?.newDate || order.deliveryDate); }} variant="success" small>Approve Revision</Btn>
                <Btn onClick={() => setConfirmAction("deny_revision")} variant="danger" small>Deny Revision</Btn>
              </>
            )}
            {order.status === "issue_reported" && (
              <Btn onClick={() => setConfirmAction("respond_issue")} variant="primary" small>Respond to Issue</Btn>
            )}
          </div>

          {isProcessing && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e40af", marginBottom: 12 }}>Processing Order {order.orderNumber}</div>

              <Input label="Delivery Date (confirm or change)" type="date" value={processingDate} onChange={e => setProcessingDate(e.target.value)} />

              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, marginTop: 8 }}>Modify Line Items (substitute bundle counts as needed)</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 10 }}>
                <thead>
                  <tr style={{ background: "#dbeafe" }}>
                    <th style={{ padding: "5px 6px", textAlign: "left" }}>Type</th>
                    <th style={{ padding: "5px 6px", textAlign: "center" }}>Bar</th>
                    <th style={{ padding: "5px 6px", textAlign: "center" }}>Length</th>
                    <th style={{ padding: "5px 6px", textAlign: "center" }}>Pcs/Bdl</th>
                    <th style={{ padding: "5px 6px", textAlign: "center" }}># Bdls</th>
                    <th style={{ padding: "5px 6px", textAlign: "right" }}>Tons</th>
                  </tr>
                </thead>
                <tbody>
                  {processingLines.map((l, i) => {
                    const origLine = order.lines.find(ol => ol.id === l.id);
                    const pcsChanged = origLine && origLine.pcsPerBundle !== l.pcsPerBundle;
                    const bdlChanged = origLine && origLine.numBundles !== l.numBundles;
                    return (
                      <tr key={l.id} style={{ borderBottom: "1px solid #bfdbfe" }}>
                        <td style={{ padding: "5px 6px" }}>{LINE_TYPES[l.lineType]?.label || l.lineType}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>{l.barSize}</td>
                        <td style={{ padding: "5px 6px", textAlign: "center" }}>{l.feet}'{l.inches > 0 ? ` ${l.inches}"` : ""}</td>
                        <td style={{ padding: "4px 4px", textAlign: "center" }}>
                          <input type="number" min={1} value={l.pcsPerBundle}
                            onChange={e => updateProcessingLine(l.id, "pcsPerBundle", parseInt(e.target.value) || 1)}
                            style={{ width: 60, padding: "3px 6px", border: `1px solid ${pcsChanged ? "#f59e0b" : "#d1d5db"}`, borderRadius: 4, textAlign: "center", fontSize: 13, background: pcsChanged ? "#fef3c7" : "#fff" }} />
                        </td>
                        <td style={{ padding: "4px 4px", textAlign: "center" }}>
                          <input type="number" min={1} value={l.numBundles}
                            onChange={e => updateProcessingLine(l.id, "numBundles", parseInt(e.target.value) || 1)}
                            style={{ width: 60, padding: "3px 6px", border: `1px solid ${bdlChanged ? "#f59e0b" : "#d1d5db"}`, borderRadius: 4, textAlign: "center", fontSize: 13, background: bdlChanged ? "#fef3c7" : "#fff" }} />
                        </td>
                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 600 }}>{formatTons(calcTons(l.feet, l.inches, l.pcsPerBundle, l.numBundles, l.barSize))}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ background: "#d1fae5", fontWeight: 700 }}>
                    <td colSpan={5} style={{ padding: "6px", textAlign: "right" }}>New Total ({Math.ceil(getOrderTotalTons(processingLines) / 22)} est. truckloads)</td>
                    <td style={{ padding: "6px", textAlign: "right" }}>{formatTons(getOrderTotalTons(processingLines))} T</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3 }}>Processing Note (changes made, subs, etc.)</label>
                <textarea style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, minHeight: 50, boxSizing: "border-box" }}
                  value={processingNote} onChange={e => setProcessingNote(e.target.value)}
                  placeholder="e.g. Substituted 30-count to 29-count for #6 Long, combined with P1032#002 for full truckload..." />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(() => {
                  const buildChangeLog = () => {
                    const changes = [];
                    if (processingDate !== order.deliveryDate) changes.push(`Delivery date changed: ${formatDate(order.deliveryDate)} → ${formatDate(processingDate)}`);
                    processingLines.forEach(l => {
                      const orig = order.lines.find(ol => ol.id === l.id);
                      if (orig) {
                        if (orig.pcsPerBundle !== l.pcsPerBundle) changes.push(`${LINE_TYPES[l.lineType]?.label}: pcs/bdl ${orig.pcsPerBundle} → ${l.pcsPerBundle}`);
                        if (orig.numBundles !== l.numBundles) changes.push(`${LINE_TYPES[l.lineType]?.label}: # bdls ${orig.numBundles} → ${l.numBundles}`);
                      }
                    });
                    return (changes.length > 0 ? changes.join("; ") : "No changes to line items") + (processingNote ? ` | Note: ${processingNote}` : "");
                  };

                  const isAlreadyConfirmedOrLater = ["confirmed", "delivered", "issue_reported", "issue_resolved", "revision_denied"].includes(order.status);

                  return (
                    <>
                      {!isAlreadyConfirmedOrLater && (
                        <Btn onClick={() => {
                          const updated = { ...order, status: "confirmed", deliveryDate: processingDate, lines: processingLines,
                            history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: "Order processed and confirmed by CMC", by: cmcUserName, details: buildChangeLog() }]
                          };
                          onUpdateOrder(updated);
                          setIsProcessing(false);
                          showToast("Order processed and confirmed", "success");
                        }} variant="success" small>Confirm with Changes</Btn>
                      )}
                      {!isAlreadyConfirmedOrLater && (
                        <Btn onClick={() => {
                          const changes = [];
                          if (processingDate !== order.deliveryDate) changes.push(`Date proposed: ${formatDate(processingDate)}`);
                          processingLines.forEach(l => {
                            const orig = order.lines.find(ol => ol.id === l.id);
                            if (orig && (orig.pcsPerBundle !== l.pcsPerBundle || orig.numBundles !== l.numBundles)) {
                              changes.push(`${LINE_TYPES[l.lineType]?.label}: ${orig.pcsPerBundle}x${orig.numBundles} → ${l.pcsPerBundle}x${l.numBundles}`);
                            }
                          });
                          const detailStr = changes.length > 0 ? changes.join("; ") : "Processing started";
                          const updated = { ...order, status: "processing", deliveryDate: processingDate, lines: processingLines,
                            history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: "Processing — changes saved (not yet confirmed)", by: cmcUserName, details: detailStr + (processingNote ? ` | Note: ${processingNote}` : "") }]
                          };
                          onUpdateOrder(updated);
                          setIsProcessing(false);
                          showToast("Changes saved (order still processing)", "info");
                        }} variant="primary" small>Save as Processing</Btn>
                      )}
                      {isAlreadyConfirmedOrLater && (
                        <Btn onClick={() => {
                          const updated = { ...order, deliveryDate: processingDate, lines: processingLines,
                            history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: `Order revised by CMC (status: ${STATUS_CONFIG[order.status]?.label || order.status})`, by: cmcUserName, details: buildChangeLog() }]
                          };
                          onUpdateOrder(updated);
                          setIsProcessing(false);
                          showToast("Order revised successfully", "success");
                        }} variant="success" small>Save Revisions</Btn>
                      )}
                      {isAlreadyConfirmedOrLater && order.status !== "confirmed" && (
                        <Btn onClick={() => {
                          const updated = { ...order, status: "confirmed", deliveryDate: processingDate, lines: processingLines,
                            history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: "Order revised and re-confirmed by CMC", by: cmcUserName, details: buildChangeLog() }]
                          };
                          onUpdateOrder(updated);
                          setIsProcessing(false);
                          showToast("Order revised and re-confirmed", "success");
                        }} variant="primary" small>Save & Re-Confirm</Btn>
                      )}
                      <Btn onClick={() => setIsProcessing(false)} variant="outline" small>Cancel</Btn>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {confirmAction && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              {confirmAction === "approve_revision" && (
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3 }}>Delivery Date (adjust if needed)</label>
                  <input type="date" value={revisionDate} onChange={e => setRevisionDate(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box", marginBottom: 4 }} />
                  {revisionDate !== order.deliveryDate && (
                    <div style={{ fontSize: 12, color: "#d97706", fontWeight: 500 }}>Date will change: {formatDate(order.deliveryDate)} → {formatDate(revisionDate)}</div>
                  )}
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
                  {confirmAction === "approve_revision" ? "Approval Note" : confirmAction === "deny_revision" ? "Reason for Denial" : "Response to Issue"}
                </label>
                <textarea style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, minHeight: 60, boxSizing: "border-box" }} value={cmcResponse} onChange={e => setCmcResponse(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => {
                  if (confirmAction === "approve_revision") {
                    const lastRev = order.revisionRequests[order.revisionRequests.length - 1];
                    const revisions = [...order.revisionRequests];
                    revisions[revisions.length - 1] = { ...lastRev, response: cmcResponse || "Approved" };
                    const finalDate = revisionDate || lastRev.newDate || order.deliveryDate;
                    const dateChanged = finalDate !== order.deliveryDate;
                    const detailParts = [];
                    if (dateChanged) detailParts.push(`Delivery date: ${formatDate(order.deliveryDate)} → ${formatDate(finalDate)}`);
                    if (cmcResponse) detailParts.push(cmcResponse);
                    const updated = { ...order, status: "confirmed", deliveryDate: finalDate, revisionRequests: revisions,
                      history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: "Revision approved by CMC", by: cmcUserName, details: detailParts.join(" | ") || "Approved" }]
                    };
                    onUpdateOrder(updated);
                    showToast("Revision approved", "success");
                  } else if (confirmAction === "deny_revision") {
                    const revisions = [...order.revisionRequests];
                    revisions[revisions.length - 1] = { ...revisions[revisions.length - 1], response: cmcResponse || "Denied" };
                    const updated = { ...order, status: "revision_denied", revisionRequests: revisions,
                      history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: "Revision denied by CMC", by: cmcUserName, details: cmcResponse }]
                    };
                    onUpdateOrder(updated);
                    showToast("Revision denied", "info");
                  } else {
                    const issues = [...order.issues];
                    issues[issues.length - 1] = { ...issues[issues.length - 1], response: cmcResponse };
                    const updated = { ...order, status: "issue_resolved", issues,
                      history: [...order.history, { date: new Date().toISOString().slice(0, 10), action: "Issue responded to by CMC", by: cmcUserName, details: cmcResponse }]
                    };
                    onUpdateOrder(updated);
                    showToast("Issue response sent", "success");
                  }
                  setCmcResponse(""); setConfirmAction(null); setRevisionDate("");
                }} variant="success" small>Submit</Btn>
                <Btn onClick={() => { setCmcResponse(""); setConfirmAction(null); setRevisionDate(""); }} variant="outline" small>Cancel</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Continue in next part due to size...

// ── New Order Form (streamlined per 4a-4e) ──
function NewOrderForm({ project, customer, onSubmit, existingOrders, showToast }) {
  const nextNum = useMemo(() => {
    const existing = existingOrders.filter(o => o.jobNumber === project.jobNumber);
    const nums = existing.map(o => { const m = o.orderNumber.match(/#(\d+)/); return m ? parseInt(m[1]) : 0; });
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return max + 1;
  }, [project, existingOrders]);

  const orderNumber = `${getJobShort(project.jobNumber)}#${String(nextNum).padStart(3, "0")}`;

  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [segment, setSegment] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [backupName, setBackupName] = useState("");
  const [backupPhone, setBackupPhone] = useState("");
  const [lines, setLines] = useState([{ id: genId(), lineType: "longitudinal", barSize: "#6", feet: 60, inches: 0, pcsPerBundle: 30, numBundles: 1 }]);

  const addLine = (type) => {
    const preset = LINE_TYPES[type];
    setLines([...lines, { id: genId(), lineType: type, barSize: preset.barSize, feet: preset.defaultFeet || 60, inches: preset.defaultInches || 0, pcsPerBundle: preset.defaultPcs, numBundles: 1 }]);
  };
  const removeLine = (id) => setLines(lines.filter(l => l.id !== id));
  const updateLine = (id, field, value) => {
    setLines(lines.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === "lineType") {
        const preset = LINE_TYPES[value];
        updated.barSize = preset.barSize;
        updated.feet = preset.defaultFeet || 60;
        updated.inches = preset.defaultInches || 0;
        updated.pcsPerBundle = preset.defaultPcs;
      }
      return updated;
    }));
  };

  const totalTons = getOrderTotalTons(lines);

  const minDeliveryDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  }, []);

  function renderLineFields(l) {
    const preset = LINE_TYPES[l.lineType];
    if (!preset) return null;

    if (l.lineType === "longitudinal") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <Select label="Length" value={l.feet} onChange={e => updateLine(l.id, "feet", parseInt(e.target.value))}>
            <option value={40}>40'</option>
            <option value={60}>60'</option>
          </Select>
          <Input label="Pcs/Bundle (18-72)" type="number" min={18} max={72} value={l.pcsPerBundle} onChange={e => {
            let v = parseInt(e.target.value) || 18;
            if (v < 18) v = 18; if (v > 72) v = 72;
            updateLine(l.id, "pcsPerBundle", v);
          }} />
          <Input label="# Bundles" type="number" min={1} value={l.numBundles} onChange={e => updateLine(l.id, "numBundles", parseInt(e.target.value) || 1)} />
        </div>
      );
    }

    if (l.lineType === "transverse") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          <Input label="Feet" type="number" min={0} value={l.feet} onChange={e => updateLine(l.id, "feet", parseInt(e.target.value) || 0)} />
          <Input label="Inches" type="number" min={0} max={11} value={l.inches} onChange={e => updateLine(l.id, "inches", parseInt(e.target.value) || 0)} />
          <Select label="Pcs/Bundle" value={l.pcsPerBundle} onChange={e => updateLine(l.id, "pcsPerBundle", parseInt(e.target.value))}>
            <option value={51}>51</option>
            <option value={99}>99</option>
          </Select>
          <Input label="# Bundles" type="number" min={1} value={l.numBundles} onChange={e => updateLine(l.id, "numBundles", parseInt(e.target.value) || 1)} />
        </div>
      );
    }

    if (l.lineType === "singlepiece") {
      return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          <Input label="Feet" type="number" min={0} value={l.feet} onChange={e => updateLine(l.id, "feet", parseInt(e.target.value) || 0)} />
          <Input label="Inches" type="number" min={0} max={11} value={l.inches} onChange={e => updateLine(l.id, "inches", parseInt(e.target.value) || 0)} />
          <Select label="Pcs/Bundle" value={l.pcsPerBundle} onChange={e => updateLine(l.id, "pcsPerBundle", parseInt(e.target.value))}>
            <option value={51}>51</option>
            <option value={99}>99</option>
          </Select>
          <Input label="# Bundles" type="number" min={1} value={l.numBundles} onChange={e => updateLine(l.id, "numBundles", parseInt(e.target.value) || 1)} />
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 6 }}>
        <Select label="Bar Size" value={l.barSize} onChange={e => updateLine(l.id, "barSize", e.target.value)}>
          {["#3", "#4", "#5", "#6", "#7", "#8"].map(b => <option key={b} value={b}>{b}</option>)}
        </Select>
        <Input label="Feet" type="number" min={0} value={l.feet} onChange={e => updateLine(l.id, "feet", parseInt(e.target.value) || 0)} />
        <Input label="Inches" type="number" min={0} max={11} value={l.inches} onChange={e => updateLine(l.id, "inches", parseInt(e.target.value) || 0)} />
        <Input label="Pcs/Bundle" type="number" min={1} value={l.pcsPerBundle} onChange={e => updateLine(l.id, "pcsPerBundle", parseInt(e.target.value) || 1)} />
        <Input label="# Bundles" type="number" min={1} value={l.numBundles} onChange={e => updateLine(l.id, "numBundles", parseInt(e.target.value) || 1)} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: "#eff6ff", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
        <strong>Job:</strong> {project.jobNumber} - {project.projectName}<br />
        <strong>Order Number:</strong> <span style={{ fontWeight: 700, color: "#1d4ed8" }}>{orderNumber}</span> (auto-assigned)
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 }}>
        <div style={{ marginBottom: 8 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 3 }}>Delivery Date * <span style={{ fontWeight: 400, color: "#6b7280" }}>(minimum 3 days lead time)</span></label>
          <input type="date" value={deliveryDate} min={minDeliveryDate} onChange={e => {
            if (e.target.value < minDeliveryDate) { showToast("Delivery date must be at least 3 days from today.", "error"); return; }
            setDeliveryDate(e.target.value);
          }} style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <Input label="Delivery Location (Google Maps link)" value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} placeholder="https://maps.app.goo.gl/..." />
      </div>
      <Input label="Segment / Description *" value={segment} onChange={e => setSegment(e.target.value)} placeholder="e.g. Paving Area 21 - 12' - STA 427+00 to STA 238+00" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 2 }}>
        <Input label="Primary Contact Name *" value={contactName} onChange={e => setContactName(e.target.value)} />
        <Input label="Primary Contact Phone *" value={contactPhone} onChange={e => setContactPhone(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Input label="Backup Contact Name" value={backupName} onChange={e => setBackupName(e.target.value)} />
        <Input label="Backup Contact Phone" value={backupPhone} onChange={e => setBackupPhone(e.target.value)} />
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Line Items</div>
      {lines.map((l, i) => (
        <div key={l.id} style={{ background: "#f9fafb", borderRadius: 6, padding: "8px 10px", marginBottom: 4, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>#{i + 1}</span>
              <select value={l.lineType} onChange={e => updateLine(l.id, "lineType", e.target.value)}
                style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13, fontWeight: 600, background: "#fff" }}>
                {Object.entries(LINE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <span style={{ fontSize: 12, color: "#6b7280" }}>({l.barSize})</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>{formatTons(calcTons(l.feet, l.inches, l.pcsPerBundle, l.numBundles, l.barSize))} T</span>
              {lines.length > 1 && <button onClick={() => removeLine(l.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 14, padding: "0 2px" }}>x</button>}
            </div>
          </div>
          {renderLineFields(l)}
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, marginBottom: 12 }}>
        <Btn onClick={() => addLine("longitudinal")} variant="outline" small>+ Longitudinal</Btn>
        <Btn onClick={() => addLine("transverse")} variant="outline" small>+ Transverse</Btn>
        <Btn onClick={() => addLine("singlepiece")} variant="outline" small>+ Tie Bar</Btn>
        <Btn onClick={() => addLine("other")} variant="outline" small>+ Other</Btn>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>Order Total: {formatTons(totalTons)} tons</span>
        <span style={{ fontSize: 14, color: "#374151" }}>{Math.ceil(totalTons / 22)} est. truckload{Math.ceil(totalTons / 22) !== 1 ? "s" : ""}</span>
      </div>

      <Btn onClick={() => {
        if (!deliveryDate || !contactName || !contactPhone || !segment.trim()) { showToast("Please fill in all required fields (date, segment, contact).", "error"); return; }
        if (deliveryDate < minDeliveryDate) { showToast("Delivery date must be at least 3 days from today. We need lead time to process your order.", "error"); return; }
        onSubmit({
          id: genId(), orderNumber, jobNumber: project.jobNumber, jobName: project.projectName,
          customer, deliveryDate, deliveryLocation, status: "submitted", segment,
          createdAt: new Date().toISOString(), contactName, contactPhone, backupName, backupPhone,
          lines, history: [{ date: new Date().toISOString().slice(0, 10), action: "Order created", by: customer }],
          revisionRequests: [], issues: [],
        });
        showToast(`Order ${orderNumber} submitted successfully!`, "success");
      }} variant="success" style={{ width: "100%", padding: "10px 16px" }} disabled={!deliveryDate || !contactName || !contactPhone || !segment.trim()}>
        Submit Order
      </Btn>
    </div>
  );
}

// ── Inline order row with expandable history ──
function OrderRow({ o, isExpanded, onToggle, onSelect, showJob, actionLabel }) {
  const tons = getOrderTotalTons(o.lines);
  const needsAttention = ["submitted", "revision_requested", "issue_reported"].includes(o.status);
  return (
    <>
      <tr onClick={() => onToggle(o.id)} style={{ borderBottom: isExpanded ? "none" : "1px solid #e5e7eb", cursor: "pointer", background: needsAttention ? "#fffbeb" : "#fff" }}>
        {showJob && <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 12 }}>{o.jobNumber}</td>}
        {showJob && <td style={{ padding: "8px 10px", fontSize: 13 }}>{o.jobName}</td>}
        <td style={{ padding: "8px 10px", fontWeight: 600, fontSize: 13 }}>{o.orderNumber}</td>
        <td style={{ padding: "8px 10px", fontSize: 13 }}>{formatDate(o.deliveryDate)}</td>
        <td style={{ padding: "8px 10px", fontSize: 13 }}>{o.segment}</td>
        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600, fontSize: 13 }}>{formatTons(tons)}</td>
        <td style={{ padding: "8px 10px", textAlign: "center" }}><StatusBadge status={o.status} /></td>
        <td style={{ padding: "8px 10px", textAlign: "center" }}>
          <Btn onClick={(e) => { e.stopPropagation(); onSelect(o); }} variant="ghost" small>{actionLabel || "View"}</Btn>
        </td>
      </tr>
      {isExpanded && (
        <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
          <td colSpan={showJob ? 8 : 6} style={{ padding: "0 10px 12px 28px", background: "#f9fafb" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 8, marginBottom: 4 }}>Order History</div>
            <div style={{ borderLeft: "2px solid #d1d5db", paddingLeft: 12 }}>
              {o.history.map((h, i) => (
                <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{h.action}</span>
                  <span style={{ color: "#6b7280" }}> - {h.date} by {h.by}</span>
                  {h.details && <span style={{ fontStyle: "italic", color: "#6b7280" }}> ({h.details})</span>}
                </div>
              ))}
            </div>
            {o.lines.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 2 }}>Line Items</div>
                {o.lines.map(l => (
                  <div key={l.id} style={{ fontSize: 12, color: "#6b7280", padding: "1px 0" }}>
                    {LINE_TYPES[l.lineType]?.label || l.lineType} | {l.barSize} | {l.feet}'{l.inches > 0 ? `${l.inches}"` : ""} | {l.pcsPerBundle} pcs x {l.numBundles} bdls = {formatTons(calcTons(l.feet, l.inches, l.pcsPerBundle, l.numBundles, l.barSize))} T
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ══════════════════ MAIN APP ══════════════════
function CMCPavingPortal() {
  const [portalView, setPortalView] = useState("landing");
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState({ message: "", type: "info" });

  // ── Auth state ──
  const [authMode, setAuthMode] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Registration fields
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPw, setRegConfirmPw] = useState("");
  const [regDisplayName, setRegDisplayName] = useState("");
  const [regCompany, setRegCompany] = useState("");

  // Customer state
  const [selectedProject, setSelectedProject] = useState(null);
  const [customerView, setCustomerView] = useState("projects");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // CMC state
  const [cmcFilter, setCmcFilter] = useState("all");
  const [cmcJobFilter, setCmcJobFilter] = useState("all");
  const [cmcSearch, setCmcSearch] = useState("");
  const [cmcSelectedOrder, setCmcSelectedOrder] = useState(null);
  const [cmcExpandedOrderId, setCmcExpandedOrderId] = useState(null);

  // ── Toast ──
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "info" }), 4000);
  }, []);

  // ── Auto-restore session on mount ──
  useEffect(() => {
    if (AUTH_TOKEN && !currentUser) {
      api.get("/api/orders").then(() => {
        // Token is valid - user can stay logged in
      }).catch(() => {
        AUTH_TOKEN = null;
        localStorage.removeItem("cmc_token");
      });
    }
  }, []);

  // ── Fetch orders from API ──
  const fetchOrders = useCallback(async () => {
    if (!currentUser) return;
    try {
      const result = await api.get("/api/orders");
      setOrders(result);
    } catch (e) {
      console.error("Error fetching orders:", e);
    }
  }, [currentUser]);

  // ── Poll orders every 2 seconds ──
  useEffect(() => {
    if (!currentUser) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 2000);
    return () => clearInterval(interval);
  }, [currentUser, fetchOrders]);

  // ── Auto-deliver logic ──
  useEffect(() => {
    if (!currentUser) return;
    const today = new Date().toISOString().slice(0, 10);
    orders.forEach(async (o) => {
      if (o.status === "confirmed" && o.deliveryDate && today > o.deliveryDate) {
        const updated = {
          ...o, status: "delivered",
          history: [...o.history, { date: today, action: "Auto-delivered (delivery date passed)", by: "System" }],
        };
        try { await api.put("/api/orders/" + o.id, updated); } catch(e) {}
      }
    });
  }, [orders, currentUser]);

  // ── Auth handlers ──
  const handleCustomerLogin = async () => {
    try {
      const result = await api.post("/api/auth/login", { username: loginUsername, password: loginPassword, portalType: "customer" });
      AUTH_TOKEN = result.token;
      localStorage.setItem("cmc_token", AUTH_TOKEN);
      setCurrentUser(result.user);
      setLoginError(""); setLoginUsername(""); setLoginPassword("");
      showToast("Logged in successfully", "success");
    } catch (e) {
      setLoginError(e.error || "Invalid username or password.");
    }
  };

  const handleCmcLogin = async () => {
    try {
      const result = await api.post("/api/auth/login", { username: loginUsername, password: loginPassword, portalType: "cmc" });
      AUTH_TOKEN = result.token;
      localStorage.setItem("cmc_token", AUTH_TOKEN);
      setCurrentUser(result.user);
      setLoginError(""); setLoginUsername(""); setLoginPassword("");
      showToast("Logged in successfully", "success");
    } catch (e) {
      setLoginError(e.error || "Invalid CMC credentials.");
    }
  };

  const handleRegister = async () => {
    if (!regUsername.trim() || !regPassword || !regDisplayName.trim() || !regCompany.trim()) { setLoginError("All fields are required."); return; }
    if (regPassword.length < 6) { setLoginError("Password must be at least 6 characters."); return; }
    if (regPassword !== regConfirmPw) { setLoginError("Passwords do not match."); return; }
    try {
      const result = await api.post("/api/auth/register", { username: regUsername, password: regPassword, displayName: regDisplayName, company: regCompany });
      AUTH_TOKEN = result.token;
      localStorage.setItem("cmc_token", AUTH_TOKEN);
      setCurrentUser(result.user);
      setLoginError(""); setRegUsername(""); setRegPassword(""); setRegConfirmPw(""); setRegDisplayName(""); setRegCompany("");
      showToast("Account created successfully!", "success");
    } catch (e) {
      setLoginError(e.error || "Registration failed.");
    }
  };

  const handleLogout = () => {
    AUTH_TOKEN = null;
    localStorage.removeItem("cmc_token");
    setCurrentUser(null); setSelectedProject(null); setSelectedOrder(null); setCmcSelectedOrder(null);
    setCustomerView("projects"); setPortalView("landing"); setAuthMode("login");
    setLoginUsername(""); setLoginPassword(""); setLoginError("");
  };

  // ── Link/unlink project ──
  const linkProject = async (jobNumber) => {
    if (!currentUser) return;
    try {
      const result = await api.post("/api/users/link-project", { jobNumber });
      setCurrentUser(prev => ({ ...prev, linkedProjects: result.linkedProjects }));
      setProjectSearch("");
      showToast("Project linked successfully", "success");
    } catch (e) { 
      showToast("Error linking project", "error"); 
    }
  };

  // ── Handlers ──
  const updateOrder = useCallback(async (updated) => {
    try {
      await api.put("/api/orders/" + updated.id, updated);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(prev => prev?.id === updated.id ? updated : prev);
      setCmcSelectedOrder(prev => prev?.id === updated.id ? updated : prev);
    } catch (e) { 
      showToast("Error updating order: " + (e.error || e.message), "error"); 
    }
  }, []);

  const addOrder = useCallback(async (order) => {
    try {
      const saved = await api.post("/api/orders", order);
      setOrders(prev => [...prev, saved]);
      setCustomerView("orders");
      showToast("Order created successfully", "success");
    } catch (e) { 
      showToast("Error creating order: " + (e.error || e.message), "error"); 
    }
  }, []);

  // ── Filtered data ──
  const linkedProjectsList = useMemo(() => {
    if (!currentUser || currentUser.type !== "customer") return [];
    return PROJECT_DIRECTORY.filter(p => currentUser.linkedProjects.includes(p.jobNumber));
  }, [currentUser]);

  const customerOrders = useMemo(() => {
    if (!currentUser || currentUser.type !== "customer") return [];
    return orders.filter(o => currentUser.linkedProjects.includes(o.jobNumber)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, currentUser]);

  const projectOrders = useMemo(() => {
    if (!selectedProject) return [];
    return orders.filter(o => o.jobNumber === selectedProject.jobNumber).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, selectedProject]);

  const filteredProjects = useMemo(() => {
    if (!projectSearch) return [];
    const q = projectSearch.toLowerCase();
    return PROJECT_DIRECTORY.filter(p =>
      p.customer.toLowerCase().includes(q) || p.gc.toLowerCase().includes(q) ||
      p.projectName.toLowerCase().includes(q) || p.jobNumber.toLowerCase().includes(q)
    ).sort((a, b) => a.jobNumber.localeCompare(b.jobNumber)).slice(0, 40);
  }, [projectSearch]);

  const cmcOrders = useMemo(() => {
    let filtered = [...orders];
    if (cmcFilter !== "all") filtered = filtered.filter(o => o.status === cmcFilter);
    if (cmcJobFilter !== "all") filtered = filtered.filter(o => o.jobNumber === cmcJobFilter);
    if (cmcSearch) {
      const q = cmcSearch.toLowerCase();
      filtered = filtered.filter(o => o.orderNumber.toLowerCase().includes(q) || o.jobName.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q) || o.jobNumber.toLowerCase().includes(q));
    }
    return filtered.sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  }, [orders, cmcFilter, cmcJobFilter, cmcSearch]);

  const allJobs = useMemo(() => [...new Set(orders.map(o => o.jobNumber))].sort(), [orders]);

  const cmcStats = useMemo(() => {
    const submitted = orders.filter(o => o.status === "submitted").length;
    const processing = orders.filter(o => o.status === "processing").length;
    const revisions = orders.filter(o => o.status === "revision_requested").length;
    const issues = orders.filter(o => o.status === "issue_reported").length;
    const totalTons = orders.filter(o => !["delivered", "issue_resolved"].includes(o.status)).reduce((s, o) => s + getOrderTotalTons(o.lines), 0);
    return { submitted, processing, revisions, issues, totalTons };
  }, [orders]);

  const exportCSV = () => {
    fetch("/api/export/csv", { headers: { Authorization: "Bearer " + AUTH_TOKEN } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "CMC_Orders_" + new Date().toISOString().slice(0,10) + ".csv";
        a.click();
        URL.revokeObjectURL(url);
        showToast("CSV downloaded", "success");
      })
      .catch(() => showToast("Error exporting CSV", "error"));
  };

  // ══════════════════ LANDING PAGE ══════════════════
  if (portalView === "landing") {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#fff" }}>
        <Toast {...toast} onClose={() => setToast({ message: "", type: "info" })} />
        <div style={{ textAlign: "center", maxWidth: 700, padding: "0 24px" }}>
          <div style={{ fontSize: 56, fontWeight: 800, marginBottom: 4, letterSpacing: -1 }}>CMC</div>
          <div style={{ fontSize: 22, fontWeight: 300, color: "#93c5fd", marginBottom: 8 }}>COMMERCIAL METALS COMPANY</div>
          <div style={{ width: 80, height: 3, background: "#3b82f6", margin: "0 auto 24px" }}></div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>Paving Order Portal</div>
          <div style={{ fontSize: 16, color: "#94a3b8", marginBottom: 48, lineHeight: 1.6 }}>
            Centralized order management for CRCP paving rebar. Streamlined communication between CMC and all customers.
          </div>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => { setPortalView("customer"); setAuthMode("login"); }} style={{ padding: "16px 40px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.4)" }}>
              Customer Portal
              <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 4 }}>Place & track orders</div>
            </button>
            <button onClick={() => { setPortalView("cmc"); setAuthMode("login"); }} style={{ padding: "16px 40px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(5,150,105,0.4)" }}>
              CMC Portal
              <div style={{ fontSize: 12, fontWeight: 400, opacity: 0.8, marginTop: 4 }}>Manage all orders</div>
            </button>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 24, color: "#475569", fontSize: 13 }}>CMC Paving Order Platform - Seguin, TX</div>
      </div>
    );
  }

  // ══════════════════ LOGIN SCREENS ══════════════════
  if (!currentUser) {
    const isCmc = portalView === "cmc";
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <Toast {...toast} onClose={() => setToast({ message: "", type: "info" })} />
        <div style={{ background: isCmc ? "#065f46" : "#1d4ed8", color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 20 }}>CMC</span>
            <span style={{ opacity: 0.8, fontSize: 14 }}>{isCmc ? "Internal Portal" : "Customer Portal"}</span>
          </div>
          <Btn onClick={() => { setPortalView("landing"); setLoginError(""); }} variant="ghost" style={{ color: "#fff" }}>Back</Btn>
        </div>
        <div style={{ maxWidth: 440, margin: "60px auto", padding: 24 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
            {authMode === "login" && (
              <>
                <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>{isCmc ? "CMC Staff Login" : "Customer Login"}</h2>
                <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>
                  {isCmc ? "Authorized CMC personnel only." : "Sign in to manage your paving orders."}
                </p>
                {loginError && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{loginError}</div>}
                <Input label="Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Enter your username" />
                <Input label="Password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter your password"
                  onKeyDown={e => { if (e.key === "Enter") isCmc ? handleCmcLogin() : handleCustomerLogin(); }} />
                <Btn onClick={isCmc ? handleCmcLogin : handleCustomerLogin} variant={isCmc ? "success" : "primary"} style={{ width: "100%", padding: "10px 16px", marginTop: 4 }}>
                  Sign In
                </Btn>
                {!isCmc && (
                  <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
                    Don't have an account?{" "}
                    <span onClick={() => { setAuthMode("register"); setLoginError(""); }} style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>Register here</span>
                  </div>
                )}
                {isCmc && (
                  <div style={{ marginTop: 16, padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#6b7280" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Test Credentials:</div>
                    <div>milan / cmc2026</div>
                    <div>robin / cmc2026</div>
                    <div>jesse / cmc2026</div>
                  </div>
                )}
                {!isCmc && (
                  <div style={{ marginTop: 12, padding: 12, background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#6b7280" }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Test Accounts:</div>
                    <div>robnash / rob2026 (Rob Nash - Test)</div>
                    <div>webber_admin / webber2026</div>
                    <div>zachry_admin / zachry2026</div>
                    <div>breda_admin / breda2026</div>
                  </div>
                )}
              </>
            )}

            {authMode === "register" && (
              <>
                <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700 }}>Create Account</h2>
                <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 20 }}>Register your company for the CMC Paving Order Portal.</p>
                {loginError && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: 6, fontSize: 13, marginBottom: 12, fontWeight: 500 }}>{loginError}</div>}
                <Input label="Company Name *" value={regCompany} onChange={e => setRegCompany(e.target.value)} placeholder="e.g. Webber, Zachry Construction" />
                <Input label="Your Full Name *" value={regDisplayName} onChange={e => setRegDisplayName(e.target.value)} placeholder="e.g. John Smith" />
                <Input label="Username *" value={regUsername} onChange={e => setRegUsername(e.target.value)} placeholder="Choose a username" />
                <Input label="Password * (min 6 characters)" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
                <Input label="Confirm Password *" type="password" value={regConfirmPw} onChange={e => setRegConfirmPw(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleRegister(); }} />
                <Btn onClick={handleRegister} variant="primary" style={{ width: "100%", padding: "10px 16px", marginTop: 4 }}>Create Account</Btn>
                <div style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
                  Already have an account?{" "}
                  <span onClick={() => { setAuthMode("login"); setLoginError(""); }} style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}>Sign in</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Continue in next message - this file is very large

  // ══════════════════ CUSTOMER PORTAL (authenticated) ══════════════════
  if (portalView === "customer" && currentUser.type === "customer") {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <Toast {...toast} onClose={() => setToast({ message: "", type: "info" })} />
        <div style={{ background: "#1d4ed8", color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 20 }}>CMC</span>
            <span style={{ opacity: 0.8, fontSize: 14 }}>Customer Portal</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>{currentUser.displayName} <span style={{ opacity: 0.6 }}>({currentUser.company})</span></span>
            <Btn onClick={handleLogout} variant="ghost" style={{ color: "#fff" }} small>Sign Out</Btn>
          </div>
        </div>

        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
          <div style={{ display: "flex", gap: 0 }}>
            {[{ key: "projects", label: "My Projects" }, { key: "orders", label: "All Orders" }].map(tab => (
              <button key={tab.key} onClick={() => { setCustomerView(tab.key); setSelectedOrder(null); setSelectedProject(null); }} style={{
                padding: "12px 20px", border: "none", borderBottom: customerView === tab.key ? "3px solid #1d4ed8" : "3px solid transparent",
                background: "none", cursor: "pointer", fontWeight: customerView === tab.key ? 700 : 400,
                color: customerView === tab.key ? "#1d4ed8" : "#6b7280", fontSize: 14,
              }}>{tab.label}</button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
          {customerView === "projects" && !selectedProject && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700 }}>My Linked Projects ({linkedProjectsList.length})</h2>
              <div style={{ background: "#fff", borderRadius: 10, padding: 20, marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600 }}>Link a Project</h3>
                <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Search by customer, GC, project name, or job number:</p>
                <Input value={projectSearch} onChange={e => setProjectSearch(e.target.value)} placeholder="e.g. Collin, Williams, IH30..." />
                {filteredProjects.length > 0 && (
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 200, overflow: "auto" }}>
                    {filteredProjects.map(p => {
                      const alreadyLinked = currentUser.linkedProjects.includes(p.jobNumber);
                      return (
                        <div key={p.jobNumber} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #f3f4f6", fontSize: 13 }}>
                          <div>
                            <strong>{p.jobNumber}</strong> - {p.projectName}
                            <div style={{ color: "#6b7280", fontSize: 12 }}>{p.customer}{p.gc ? ` (GC: ${p.gc})` : ""}</div>
                          </div>
                          {alreadyLinked ? <span style={{ color: "#059669", fontSize: 12, fontWeight: 600 }}>Linked</span> :
                            <Btn onClick={() => linkProject(p.jobNumber)} variant="primary" small>Link</Btn>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {linkedProjectsList.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 10, padding: 40, textAlign: "center", color: "#6b7280" }}>No projects linked yet. Search above to link your first project.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
                  {linkedProjectsList.map(p => {
                    const pOrders = orders.filter(o => o.jobNumber === p.jobNumber);
                    const activeTons = pOrders.filter(o => !["delivered", "issue_resolved"].includes(o.status)).reduce((s, o) => s + getOrderTotalTons(o.lines), 0);
                    return (
                      <div key={p.jobNumber} onClick={() => { setSelectedProject(p); setCustomerView("orders"); }} style={{ background: "#fff", borderRadius: 10, padding: 16, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{p.projectName}</div>
                        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{p.jobNumber}{p.gc ? ` | GC: ${p.gc}` : ""}</div>
                        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                          <span><strong>{pOrders.length}</strong> orders</span>
                          <span><strong>{formatTons(activeTons)}</strong> active tons</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {customerView === "orders" && !selectedOrder && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                    {selectedProject ? `Orders - ${selectedProject.projectName}` : "All Orders"}
                  </h2>
                  {selectedProject && <span style={{ fontSize: 13, color: "#6b7280" }}>{selectedProject.jobNumber}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {selectedProject && <Btn onClick={() => { setSelectedProject(null); setCustomerView("projects"); }} variant="outline" small>Back to Projects</Btn>}
                  {selectedProject && <Btn onClick={() => setCustomerView("newOrder")} variant="success" small>+ New Order</Btn>}
                </div>
              </div>

              {(selectedProject ? projectOrders : customerOrders).length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 10, padding: 40, textAlign: "center", color: "#6b7280" }}>
                  {selectedProject ? "No orders yet for this project." : "No orders found. Link a project and create your first order."}
                </div>
              ) : (
                <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f3f4f6" }}>
                        {!selectedProject && <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Job #</th>}
                        {!selectedProject && <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Job Name</th>}
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Order #</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Delivery</th>
                        <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Segment</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 12 }}>Tons</th>
                        <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 12 }}>Status</th>
                        <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 12 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedProject ? projectOrders : customerOrders).map(o => (
                        <OrderRow key={o.id} o={o} isExpanded={expandedOrderId === o.id}
                          onToggle={(id) => setExpandedOrderId(prev => prev === id ? null : id)}
                          onSelect={(order) => setSelectedOrder(order)}
                          showJob={!selectedProject} actionLabel="Revise" />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {customerView === "orders" && selectedOrder && (
            <div>
              <Btn onClick={() => setSelectedOrder(null)} variant="outline" small style={{ marginBottom: 16 }}>Back to Orders</Btn>
              <div style={{ background: "#fff", borderRadius: 10, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <OrderDetail order={selectedOrder} isCmc={false} onUpdateOrder={updateOrder} showToast={showToast} />
              </div>
            </div>
          )}

          {customerView === "newOrder" && selectedProject && (
            <div>
              <Btn onClick={() => setCustomerView("orders")} variant="outline" small style={{ marginBottom: 16 }}>Cancel</Btn>
              <div style={{ background: "#fff", borderRadius: 10, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 700 }}>Create New Order</h2>
                <NewOrderForm project={selectedProject} customer={currentUser.company} onSubmit={addOrder} existingOrders={orders} showToast={showToast} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════ CMC PORTAL (authenticated) ══════════════════
  if (portalView === "cmc" && currentUser.type === "cmc") {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        <Toast {...toast} onClose={() => setToast({ message: "", type: "info" })} />
        <div style={{ background: "#065f46", color: "#fff", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 20 }}>CMC</span>
            <span style={{ opacity: 0.8, fontSize: 14 }}>Internal Order Management</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 13, opacity: 0.8 }}>Signed in as: <strong>{currentUser.displayName}</strong></span>
            <Btn onClick={handleLogout} variant="ghost" style={{ color: "#fff" }} small>Sign Out</Btn>
          </div>
        </div>

        {/* Stats Bar */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 24px" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { label: "New Orders", value: cmcStats.submitted, color: "#2563eb" },
              { label: "Processing", value: cmcStats.processing, color: "#d97706" },
              { label: "Revisions Pending", value: cmcStats.revisions, color: "#7c3aed" },
              { label: "Open Issues", value: cmcStats.issues, color: "#dc2626" },
              { label: "Active Tons", value: formatTons(cmcStats.totalTons), color: "#059669" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
          {!cmcSelectedOrder ? (
            <div>
              <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <Input label="Search" value={cmcSearch} onChange={e => setCmcSearch(e.target.value)} placeholder="Order #, job, customer..." />
                </div>
                <Select label="Status" value={cmcFilter} onChange={e => setCmcFilter(e.target.value)}>
                  <option value="all">All Statuses</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </Select>
                <Select label="Job" value={cmcJobFilter} onChange={e => setCmcJobFilter(e.target.value)}>
                  <option value="all">All Jobs</option>
                  {allJobs.map(j => <option key={j} value={j}>{j}</option>)}
                </Select>
                <Btn onClick={exportCSV} variant="outline" small style={{ marginBottom: 8 }}>Export CSV</Btn>
              </div>

              <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Job #</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Job Name</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Order #</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Delivery</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", fontSize: 12 }}>Segment</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", fontSize: 12 }}>Tons</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 12 }}>Status</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", fontSize: 12 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cmcOrders.map(o => (
                      <OrderRow key={o.id} o={o} isExpanded={cmcExpandedOrderId === o.id}
                        onToggle={(id) => setCmcExpandedOrderId(prev => prev === id ? null : id)}
                        onSelect={(order) => setCmcSelectedOrder(order)}
                        showJob={true} />
                    ))}
                  </tbody>
                </table>
                {cmcOrders.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No orders match current filters.</div>}
              </div>

              <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280", textAlign: "right" }}>
                {cmcOrders.length} orders | {formatTons(cmcOrders.reduce((s, o) => s + getOrderTotalTons(o.lines), 0))} total tons |{" "}
                {cmcOrders.reduce((s, o) => s + Math.ceil(getOrderTotalTons(o.lines) / 22), 0)} est. truckloads
              </div>
            </div>
          ) : (
            <div>
              <Btn onClick={() => setCmcSelectedOrder(null)} variant="outline" small style={{ marginBottom: 16 }}>Back to Orders</Btn>
              <div style={{ background: "#fff", borderRadius: 10, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <OrderDetail order={cmcSelectedOrder} isCmc={true} onUpdateOrder={updateOrder} cmcUserName={currentUser.displayName} showToast={showToast} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

ReactDOM.render(React.createElement(CMCPavingPortal), document.getElementById("root"));
