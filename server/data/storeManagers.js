// ======================================================
// STORE MANAGER MASTER LIST
// ------------------------------------------------------
// Source: "Store Manager list.xls" (employee report, 87 rows).
// This list is the single source of truth for WHO manages
// each store on the Store Status page.
//
//   store       -> store name as written in the HR sheet. It is
//                  matched to the `stores` table by name
//                  (see utils/storeManagerMatcher.js). If a name
//                  cannot be matched automatically, add it to
//                  STORE_ALIASES below.
//   employee_id -> used to find the person's Mi Arcus login
//                  (users.employee_id, else users.email) so live
//                  online/offline status still works.
//
// To update managers later: edit this list and restart the server.
// ======================================================

const STORE_MANAGERS = [
    {"employee_id": "40168", "name": "Kumar Gaurav", "store": "MRPL - DELHI MALVIYA NAGAR", "designation": "Store Manager", "mobile": "8810470296", "email": "kumargauravkg706507@gmail.com"},
    {"employee_id": "40091", "name": "Aakashdeep", "store": "MRPL - NOIDA GAUR CITY MALL", "designation": "Assistant Store Manager", "mobile": "8874036248", "email": "aakashdeep887403@gmail.com"},
    {"employee_id": "39180", "name": "Sonu Kumar", "store": "MRPL - NOIDA GRAND VENICE MALL", "designation": "Store Manager", "mobile": "8279741520", "email": "kumarsonu85933@gmail.com"},
    {"employee_id": "39435", "name": "Shashidutt", "store": "MRPL-SHIMLA", "designation": "Store Manager", "mobile": "9805237953", "email": "shahidutt01@gmail.com"},
    {"employee_id": "39051", "name": "Akshay Kumar", "store": "MRPL-KANGRA", "designation": "Assistant Store Manager", "mobile": "8219580574", "email": "akshay3746@gmail.com"},
    {"employee_id": "39339", "name": "Chetan Ghirah", "store": "MRPL-HOSHIARPUR", "designation": "Store Manager", "mobile": "8725849075", "email": "chetan947801818@gmail.com"},
    {"employee_id": "40264", "name": "Manmohan Singh", "store": "MRPL-JAMMU", "designation": "Store Manager", "mobile": "8803653110", "email": "manmohankotwal8803653110@gmail.com"},
    {"employee_id": "40277", "name": "Shubam Mehra", "store": "MRPL-JAMMU", "designation": "Store Manager", "mobile": "8082007441", "email": "mshubam415@gmail.com"},
    {"employee_id": "39398", "name": "Kaul Singh", "store": "MRPL-MCLEODGANJ", "designation": "Store Manager", "mobile": "8988419989", "email": "kabuthakur58@gmail.com"},
    {"employee_id": "39026", "name": "Abilash Singh", "store": "MRPL-GANDHI NAGAR", "designation": "Store Manager", "mobile": "9622013383", "email": "abilashsingh999@gmail.com"},
    {"employee_id": "39038", "name": "Simranjeet Singh", "store": "MRPL-BARNALA HG EATON PLAZA", "designation": "Store Manager", "mobile": "6283927040", "email": "simranjeet1994s@gmail.com"},
    {"employee_id": "39229", "name": "Ravinder", "store": "MRPL-JALANDHAR MODEL TOWN", "designation": "Store Manager", "mobile": "7009441313", "email": "revinshallu47@gmail.com"},
    {"employee_id": "39047", "name": "Shivani Dangi", "store": "MRPL-INDORE PHOENIX", "designation": "Store Manager", "mobile": "6267559371", "email": "shivanidangi95@gmail.com"},
    {"employee_id": "39360", "name": "Amit Kumar", "store": "MRPL-MALL OF DEHRADUN", "designation": "Store Manager", "mobile": "7351050379", "email": "amitakay559@gmail.com"},
    {"employee_id": "39208", "name": "Deepak Manna", "store": "MRPL - DLF AVENUE SAKET- DELHI", "designation": "Assistant Store Manager", "mobile": "8076753803", "email": "deepakmanna8765@gmail.com"},
    {"employee_id": "39074", "name": "Jyoti", "store": "MRPL-LUDHIANA-PAVILION MALL", "designation": "Store Manager", "mobile": "8557010951", "email": "arora_jyoti@icloud.com"},
    {"employee_id": "39076", "name": "Sangeeta", "store": "MRPL-NOIDA-DLF MALL OF INDIA", "designation": "Store Manager", "mobile": "7532090311", "email": "sangeetasingh3735@gmail.com"},
    {"employee_id": "40378", "name": "Varun Kumar Dhushia", "store": "MRPL-LUCKNOW-PHOENIX PALASSIO MALL", "designation": "Store Manager", "mobile": "9616805114", "email": "varunrhittika@gmail.com"},
    {"employee_id": "39099", "name": "Dayal Singh Chouhan", "store": "MRPL-GURUGRAM-AMBIENCE MALL", "designation": "Store Manager", "mobile": "9654725122", "email": "dayalchouhan958@gmail.com"},
    {"employee_id": "39152", "name": "Kapil Dev Arora", "store": "MRPL-CHANDIGARH-ELANTE MALL", "designation": "Store Manager", "mobile": "7986036916", "email": "kapildev.chd@gmail.com"},
    {"employee_id": "39129", "name": "Karamjeet", "store": "MRPL-JALANDHAR(EASTWOOD)", "designation": "Store Manager", "mobile": "6283868497", "email": "kaulkamal67@gmail.com"},
    {"employee_id": "40097", "name": "Sanjeet Kour", "store": "MRPL-SRINAGAR", "designation": "Store Manager", "mobile": "9797792700", "email": "sanjeetkour225@gmail.com"},
    {"employee_id": "40004", "name": "Rahul Kumar", "store": "MRPL-MEERUT", "designation": "Store Manager", "mobile": "7906650268", "email": "rahulk007002@gmail.com"},
    {"employee_id": "39436", "name": "Pardeep Kumar", "store": "MRPL-KARNAL", "designation": "Store Manager", "mobile": "9813272105", "email": "deeptyagi215@gmail.com"},
    {"employee_id": "40042", "name": "Vijay Tarar", "store": "MRPL-DYNASTY AHMEDABAD", "designation": "Store Manager", "mobile": "9726676250", "email": "vijaytarar150@gmail.com"},
    {"employee_id": "40313", "name": "Sahil", "store": "MRPL-BOPAL AMBLI AHMEDABAD", "designation": "Store Manager", "mobile": "9510495955", "email": "sahilll9595@gmail.com"},
    {"employee_id": "40325", "name": "Imran Khan", "store": "MRPL-SOLAN", "designation": "Store Manager", "mobile": "8352081678", "email": "ikhan26199@gmail.com"},
    {"employee_id": "40111", "name": "Harpal Singh", "store": "MRPL - BHUCHOMANDI", "designation": "Store Manager", "mobile": "9814295795", "email": "singhharpal5523@gmail.com"},
    {"employee_id": "40403", "name": "Arun Sharma", "store": "MRPL - JAIPUR", "designation": "Store Manager", "mobile": "8769770505", "email": "sharma.arun4870@gmail.com"},
    {"employee_id": "40311", "name": "Naman Verma", "store": "MRPL - CP67 MOHALI", "designation": "Store Manager", "mobile": "7988263619", "email": "vermanaman997@gmail.com"},
    {"employee_id": "39188", "name": "Suraj Kumar", "store": "MRPL-PATHANKOT", "designation": "Store Manager", "mobile": "8837758469", "email": "surajkumarbagga@gmail.com"},
    {"employee_id": "39420", "name": "Devki Nandan", "store": "MRPL - DB MALL BHOPAL", "designation": "Store Manager", "mobile": "7415438769", "email": "shubhamprajapati741@gmail.com"},
    {"employee_id": "40396", "name": "Manoj Kumar", "store": "MRPL- NDIMALL AMBALA", "designation": "Store Manager", "mobile": "8950192192", "email": "manojpaliwal55@gmail.com"},
    {"employee_id": "40286", "name": "Anoop Kumar", "store": "MRPL- WAVE MALL LUDHIANA", "designation": "Assistant Store Manager", "mobile": "9646670885", "email": "gavyshrma786@gmail.com"},
    {"employee_id": "39246", "name": "Karanveer Singh", "store": "MRPL - MBD NEOPOLIS MALL LUDHIANA", "designation": "Assistant Store Manager", "mobile": "6283414827", "email": "karanbhinder7861@gmail.com"},
    {"employee_id": "39238", "name": "Vipan Kumar", "store": "MRPL-BARNALA BRH SQUARE", "designation": "Store Manager", "mobile": "8837784573", "email": "vipankumarvipankumar758@gmail.com"},
    {"employee_id": "39255", "name": "Owais Reyaz", "store": "MRPL-ANANTNAG SRINAGAR", "designation": "Store Manager", "mobile": "7006509862", "email": "owaisriyaz2@gmail.com"},
    {"employee_id": "39260", "name": "Veeri Singh", "store": "MRPL-MANDI", "designation": "Store Manager", "mobile": "8860035855", "email": "veerisinghdream@gmail.com"},
    {"employee_id": "40149", "name": "Nikki Kumar Kanojia", "store": "MRPL-DLF PROMENADE", "designation": "Store Manager", "mobile": "9654932657", "email": "nikki161976@yahoo.com"},
    {"employee_id": "39294", "name": "Harpreet Kaur", "store": "MRPL-ZIRA", "designation": "Store Manager", "mobile": "7087820570", "email": "kaur27835@gmail.com"},
    {"employee_id": "40031", "name": "Vikash Mittal", "store": "MRPL-SRI GANGANAGAR", "designation": "Store Manager", "mobile": "8890897192", "email": "vikas.mittal.824@gmail.com"},
    {"employee_id": "39396", "name": "Pradeep Singh", "store": "MRPL-JAGGI CITY CENTER AMBALA", "designation": "Store Manager", "mobile": "9779959303", "email": "pardeepbachhal123@gmail.com"},
    {"employee_id": "40129", "name": "Parneet Singh Gill", "store": "MRPL-BATHINDA MALL ROAD", "designation": "Assistant Store Manager", "mobile": "8427321048", "email": "parneetgill8194@gmail.com"},
    {"employee_id": "39359", "name": "Arjan", "store": "MRPL-SUNVIEW", "designation": "Store Manager", "mobile": "8847044599", "email": "arjunsingh000.as@gmail.com"},
    {"employee_id": "40176", "name": "Akash Haldar", "store": "MRPL-RUDRAPUR", "designation": "Store Manager", "mobile": "6395999374", "email": "akash263160@gmail.com"},
    {"employee_id": "39348", "name": "Chetan Kumar", "store": "MRPL-PATIALA", "designation": "Store Manager", "mobile": "7009676626", "email": "chetankumar536@gmail.com"},
    {"employee_id": "39336", "name": "Ravi Kant", "store": "MRPL-HISAR", "designation": "Store Manager", "mobile": "9034433329", "email": "ravibisnaoi3329@gmail.com"},
    {"employee_id": "39481", "name": "Pawan Kumar", "store": "MRPL-MODELTOWN LDH", "designation": "Assistant Store Manager", "mobile": "7814571661", "email": "pawankumar14101990@gmail.com"},
    {"employee_id": "39352", "name": "Ashok", "store": "MRPL-KATRA", "designation": "Store Manager", "mobile": "6005910053", "email": "ashokraj04011999@gmail.com"},
    {"employee_id": "40402", "name": "Rehiza Koser", "store": "MRPL - WAVE MALL JAMMU", "designation": "Store Manager", "mobile": "8082149365", "email": "rozeqazi@gmail.com"},
    {"employee_id": "39381", "name": "Suraj Soni", "store": "MRPL-ORION MALL GORAKHPUR", "designation": "Assistant Store Manager", "mobile": "9219921180", "email": "sonisuraj537@gmail.com"},
    {"employee_id": "40218", "name": "Varsha Kumari", "store": "MRPL - AMAYRA KHARAR", "designation": "Store Manager", "mobile": "8219387700", "email": "varshathakur1993@gmail.com"},
    {"employee_id": "39414", "name": "Kiran Kumar", "store": "MRPL-APSARA ROAD JAMMU", "designation": "Store Manager", "mobile": "7006524866", "email": "adityasharma444.as@gmail.com"},
    {"employee_id": "39075", "name": "Parmod Singh", "store": "MRPL-SARABHA NAGAR, LUDHIANA", "designation": "Store Manager", "mobile": "8264256030", "email": "parmodsin818@gmail.com"},
    {"employee_id": "40126", "name": "Prakash Sharma", "store": "MRPL - ALLAHABAD", "designation": "Assistant Store Manager", "mobile": "7508880395", "email": "parkashu3416@gmail.com"},
    {"employee_id": "40394", "name": "Shiv", "store": "MRPL-ROHTAK", "designation": "Store Manager", "mobile": "9518030992", "email": "shivsolanki085@gmail.com"},
    {"employee_id": "40415", "name": "Munish", "store": "MRPL-MOGA (HG EATON SHOPPING COMPLEX)", "designation": "Store Manager", "mobile": "8360293510", "email": "khatrim942@gmail.com"},
    {"employee_id": "40009", "name": "Faizan Masood", "store": "MRPL-ILLAHI BAGH SRINAGAR", "designation": "Store Manager", "mobile": "7006409768", "email": "shahfaizan97@gmail.com"},
    {"employee_id": "40370", "name": "Gagandeep Singh", "store": "MRPL-BATALA", "designation": "Store Manager", "mobile": "6284286285", "email": "gagandeeps5236@gmail.com"},
    {"employee_id": "40160", "name": "Mukesh", "store": "MRPL-KAMLANAGAR DELHI", "designation": "Store Manager", "mobile": "8595050292", "email": "mukeshk.kumar999@gmail.com"},
    {"employee_id": "40342", "name": "Surendra Singh Bhakuni", "store": "MRPL-GOMTI NAGAR LUCKNOW", "designation": "Store Manager", "mobile": "9936345520", "email": "surendsingh1@gmail.com"},
    {"employee_id": "40387", "name": "Anshul Sharma", "store": "MANGAT RAM RAJ KUMAR JAIN JEWELLERS", "designation": "Store Manager", "mobile": "9805976828", "email": "anshulsharma0195@gmail.com"},
    {"employee_id": "40040", "name": "Simranjeet Singh", "store": "MRPL - WALK IN SQUARE AMRITSAR", "designation": "Store Manager", "mobile": "9779497534", "email": "simrandusanjh@hotmail.com"},
    {"employee_id": "40374", "name": "Pathan Imran Khan", "store": "MRPL-SURAT", "designation": "Store Manager", "mobile": "7405107475", "email": "khankhan623@gmail.com"},
    {"employee_id": "40053", "name": "Chiranjit Sinha", "store": "MRPL-BHUBANESWAR", "designation": "Store Manager", "mobile": "8908454679", "email": "chiranjit.lubu@fmail.com"},
    {"employee_id": "40359", "name": "Shailendra Kumar", "store": "MRPL - HALDWANI", "designation": "Store Manager", "mobile": "8077873064", "email": "shailenkumar141@gmail.com"},
    {"employee_id": "40065", "name": "Pushpendra Sahu", "store": "MRPL-RAIPUR", "designation": "Store Manager", "mobile": "9755182886", "email": "pushpendra.sahu1993@gmail.com"},
    {"employee_id": "39092", "name": "Adnan Khan", "store": "MRPL-HAZRATGANJ LUCKNOW", "designation": "Assistant Store Manager", "mobile": "7860987807", "email": "ak9225046@gmail.com"},
    {"employee_id": "40112", "name": "Sandeep", "store": "MRPL - MVN DEHRADUN", "designation": "Store Manager", "mobile": "8077365865", "email": "sandeepmanwal110@gmail.com"},
    {"employee_id": "40134", "name": "Manoj Kumar Gautam", "store": "MRPL - THE EMPIRE PATIALA", "designation": "Store Manager", "mobile": "9769003790", "email": "kumarmanojg38@gmail.com"},
    {"employee_id": "40052", "name": "Jagdeep Singh", "store": "MRPL - MALVIYA ROAD AMRITSAR", "designation": "Store Manager", "mobile": "9781666046", "email": "officialjagdeepsidhu@gmail.com"},
    {"employee_id": "40278", "name": "Yash Sharma", "store": "MRPL - DLF MIDTOWN PLAZA - DELHI", "designation": "Store Manager", "mobile": "6391090950", "email": "yash80222@gmail.com"},
    {"employee_id": "40421", "name": "Amresh Yadav", "store": "MRPL - DLF MIDTOWN PLAZA - DELHI", "designation": "Assistant Store Manager", "mobile": "6394359411", "email": "amresh.yadav864@gmail.com"},
    {"employee_id": "40141", "name": "Pramod Pandey", "store": "MRPL - DELHI UNITY OF ELEGANT", "designation": "Store Manager", "mobile": "9910426461", "email": "pramodpandey809@gmail.com"},
    {"employee_id": "40351", "name": "Shashank Tiwari", "store": "MRPL - AYODHYA", "designation": "Store Manager", "mobile": "9453298233", "email": "9453shashank@gmail.com"},
    {"employee_id": "40381", "name": "Karan Kumar", "store": "MRPL - DELHI JAMIA NAGAR", "designation": "Store Manager", "mobile": "9354121393", "email": "karansinh2321@gmail.com"},
    {"employee_id": "40180", "name": "Rajiv Kumar", "store": "MRPL - MOHALI WALK", "designation": "Store Manager", "mobile": "8699304609", "email": "ekamsingh582@gmail.com"},
    {"employee_id": "40159", "name": "Owais Farooq Bhat", "store": "MRPL - ANANTNAG LAL CHOWK", "designation": "Store Manager", "mobile": "7889613014", "email": "bhatowaise34@gmail.com"},
    {"employee_id": "40223", "name": "Dilawar Ahmad Lone", "store": "MRPL - KARGIL", "designation": "Store Manager", "mobile": "7006974793", "email": "lonedilawar499@gmail.com"},
    {"employee_id": "39490", "name": "Sadam Hussain", "store": "MRPL - THE EDITION MALL SRINAGAR", "designation": "Store Manager", "mobile": "8493053959", "email": "sadamkhatana780@gmail.com"},
    {"employee_id": "40365", "name": "Vikram Singh", "store": "MRPL - DLF SUMMIT PLAZA -GURUGRAM", "designation": "Store Manager", "mobile": "9616379463", "email": "vickyraizada8@gmail.com"},
    {"employee_id": "40371", "name": "Malika Angrish", "store": "MRPL - NEW JAWAHAR NAGAR JALANDHAR", "designation": "Store Manager", "mobile": "8146364609", "email": "malikamann28@gmail.com"},
    {"employee_id": "40407", "name": "Harmanjeet Singh", "store": "Mrpl - Abohar", "designation": "Store Manager", "mobile": "9876573932", "email": "sidhuh276@gmail.com"},
    {"employee_id": "40315", "name": "Jashandeep Singh", "store": "Mrpl - Goldust Patiala", "designation": "Assistant Store Manager", "mobile": "9915674093", "email": "jassal.singh.jashan@gmail.com"},
    {"employee_id": "40426", "name": "Sunaina", "store": "MRPL - HARIDWAR", "designation": "Store Manager", "mobile": "9368259794", "email": "sunainasona568@gmail.com"},
    {"employee_id": "40425", "name": "Jatinder Pal", "store": "MRPL - DORAHA", "designation": "Store Manager", "mobile": "7009300205", "email": "pjatinde@gmail.com"},
    {"employee_id": "40429", "name": "Mohammad Asif Bhat", "store": "MRPL - PULWAMA", "designation": "Store Manager", "mobile": "7298643611", "email": "mohmmadasifbhat2017@gmail.com"}
];

// Optional manual overrides: "sheet store name" -> exact
// `stores.store_name` or `stores.store_code` in the database.
// Example: "MRPL-SRINAGAR": "MRPL - SRINAGAR RESIDENCY ROAD"
const STORE_ALIASES = {
};

module.exports = { STORE_MANAGERS, STORE_ALIASES };
