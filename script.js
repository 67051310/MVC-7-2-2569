let shelters = [];
let citizens = [];
let assignments = [];

//Enter Button
function handleEnter(event){    
    if(event.key === "Enter"){
        searchReport();
    }
}

//Search by name
function searchReport(){
    const keyword = document
        .getElementById("search-input")
        .value
        .toLowerCase()
        .trim();

    const result = citizens.filter(c =>
        c.name.toLowerCase().includes(keyword)
    );

    showReport(result);
}

// Show report after search
function showReport(list){
    const div = document.getElementById("report-results");
    div.innerHTML = "";

    if(list.length === 0){
        div.innerHTML = "<p>ไม่พบรายชื่อ</p>";
        return;
    }

    list.forEach(c => {

        const assign = assignments.find(a =>
            a.citizen_id === c.id &&
            a.status === "พักอยู่"
        );

        const shelterName = assign
            ? shelters.find(s => s.id === assign.shelter_id)?.name
            : "-";

        div.innerHTML += `
            <div class="card">
                <b>${c.name}</b><br>
                อายุ: ${c.age} | ประเภท: ${c.type} | สุขภาพ: ${c.health}<br>
                สถานะ: <b>${assign ? "ได้ที่พัก" : "ตกค้าง"}</b><br>
                ศูนย์พักพิง: ${assign ? shelterName : "ยังไม่ได้ที่พัก"}
            </div>
        `;
    });
}

//show Citizens list
function displayCitizens(list){
    const ul = document.getElementById("citizen-list");
    ul.innerHTML = "";

    list.forEach(c => {
        const li = document.createElement("li");
        li.innerHTML = `
            <b>${c.name}</b> |
            อายุ: ${c.age} |
            ประเภท: ${c.type} |
            สุขภาพ: ${c.health}
        `;
        ul.appendChild(li);
    });
}

//show shelter
function displayShelters() {

    const box = document.getElementById("shelter-status");
    if (!box) return;

    box.innerHTML = "";

    shelters.forEach(shelter => {

        // นับคนที่พักอยู่จริง
        const current = assignments.filter(a =>
            a.shelter_id === shelter.id &&
            a.status === "พักอยู่"
        ).length;

        const remaining = shelter.capacity - current;

        const card = document.createElement("div");
        card.className = "shelter-card";

        card.innerHTML = `
            <div class="row">
                <span class="title">${shelter.name}</span>
                <span class="risk ${shelter.risk_level}">
                    ${shelter.risk_level.toUpperCase()}
                </span>
            </div>

            <div class="row">
                ความจุ: ${shelter.capacity} คน
            </div>

            <div class="row">
                พักอยู่ปัจจุบัน: <b>${current}</b> คน
            </div>

            <div class="row">
                ที่ว่าง:
                <span class="${remaining>0?'available':'full'}">
                    ${remaining} ที่
                </span>
            </div>

            <div class="row status ${remaining>0?'available':'full'}">
                ${remaining>0 ? ' ยังว่าง' : ' เต็มแล้ว'}
            </div>
        `;

        box.appendChild(card);
    });
}




// ===== ฟังก์ชันกรองตามปุ่ม =====
function filterCitizens(type){

    if(type === "ทั้งหมด"){
        displayCitizens(citizens);
        return;
    }

    const filtered = citizens.filter(c => c.type === type);
    displayCitizens(filtered);
}

function fixOverCapacity(data) {

    data.shelters.forEach(shelter => {

        let staying = data.assignments.filter(a =>
            a.shelter_id === shelter.id &&
            a.status === "พักอยู่"
        );

        if (staying.length > shelter.capacity) {

            staying.sort((a, b) => {
                const A = data.citizens.find(c => c.id === a.citizen_id);
                const B = data.citizens.find(c => c.id === b.citizen_id);

                const pA = (A.age < 15 || A.age >= 60) ? 1 : 0;
                const pB = (B.age < 15 || B.age > 60) ? 1 : 0;

               return pB - pA;

            });

            const overflow = staying.slice(shelter.capacity);

            overflow.forEach(a => {
                a.status = "รอจัดสรร";
                a.shelter_id = null;
            });
        }
    });

    return data;
}

function processAllocation(data){

    const { citizens, shelters, assignments } = data;

    // ===== RULE 1 แก้ศูนย์ที่ล้นก่อน =====
    shelters.forEach(shelter => {

        let staying = assignments.filter(a =>
            a.shelter_id === shelter.id &&
            a.status === "พักอยู่"
        );

        if(staying.length > shelter.capacity){

            staying.sort((a,b)=>{
                const A = citizens.find(c=>c.id===a.citizen_id);
                const B = citizens.find(c=>c.id===b.citizen_id);

                const pA = (A.age < 15 || A.age >= 60 )?1:0;
                const pB = (B.age < 15 || B.age > 60)?1:0;

                return pB-pA; // คนไม่สำคัญออกก่อน
            });

            const overflow = staying.slice(shelter.capacity);

            overflow.forEach(a=>{
                a.status = "รอจัดสรร";
                a.shelter_id = null;
            });
        }
    });

    //  RULE 4 
    const assignedIds = assignments
        .filter(a=>a.status==="พักอยู่")
        .map(a=>a.citizen_id);

    let waiting = citizens.filter(c=>!assignedIds.includes(c.id));

    // ===== RULE 2 เด็ก/แก่ ก่อน =====
    waiting.sort((a,b)=>{
        const pA = (a.age < 15 || a.age >= 60)?1:0;
        const pB = (b.age < 15 || b.age > 60)?1:0;
        return pB - pA;
    });

    // RULE 3 
    waiting.forEach(citizen=>{

        let possible = shelters;

        if(citizen.health === "weak"){
            possible = shelters.filter(s=>s.risk_level==="low");
        }

        for(let shelter of possible){

            const current = assignments.filter(a =>
                a.shelter_id===shelter.id &&
                a.status==="พักอยู่"
            ).length;

            if(current < shelter.capacity){
                assignments.push({
                    citizen_id: citizen.id,
                    shelter_id: shelter.id,
                    checkin_date: new Date().toISOString().split("T")[0],
                    status: "พักอยู่"
                });
                break;
            }
        }
    });

    return data;
}


document.addEventListener("DOMContentLoaded", () => {

    fetch("data.json")
    .then(res => res.json())
    .then(data => {
        data = fixOverCapacity(data);
        data = processAllocation(data);
        shelters = data.shelters;
        citizens = data.citizens;
        assignments = data.assignments;

        if (document.getElementById("shelter-status")) {
            displayShelters();
        }

        if (document.getElementById("citizen-list")) {
            displayCitizens(citizens);
        }

        if (document.getElementById("report-results")) {
            showReport(citizens);
        }
    });

});


