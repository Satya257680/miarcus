// ======================================================
// MIARCUS LOCATION PROVIDER
// ======================================================
// Development provider used until the company connects an
// authorized telecom/location provider. No real employee
// location is collected by this provider.
// ======================================================

const DEMO_LOCATIONS = [
    {
        employee_id: 1,
        employee_code: "EMP1001",
        name: "Rahul Sharma",
        department: "Operations",
        designation: "Field Executive",
        mobile: "98XXXXXX21",
        latitude: 18.5204,
        longitude: 73.8567,
        accuracy: 15,
        battery: 68,
        status: "online",
        address: "Viman Nagar, Pune, Maharashtra, India",
        last_update: "10:42:35 AM"
    },
    {
        employee_id: 2,
        employee_code: "EMP1002",
        name: "Priya Verma",
        department: "Sales",
        designation: "Store Executive",
        mobile: "98XXXXXX34",
        latitude: 18.5314,
        longitude: 73.8446,
        accuracy: 21,
        battery: 74,
        status: "online",
        address: "Kalyani Nagar, Pune, Maharashtra, India",
        last_update: "10:41:12 AM"
    },
    {
        employee_id: 3,
        employee_code: "EMP1003",
        name: "Amit Kumar",
        department: "Operations",
        designation: "Area Manager",
        mobile: "98XXXXXX45",
        latitude: 18.5089,
        longitude: 73.9259,
        accuracy: 12,
        battery: 82,
        status: "online",
        address: "Kharadi, Pune, Maharashtra, India",
        last_update: "10:40:05 AM"
    },
    {
        employee_id: 4,
        employee_code: "EMP1004",
        name: "Neha Singh",
        department: "Finance",
        designation: "Executive",
        mobile: "98XXXXXX56",
        latitude: 18.5679,
        longitude: 73.9143,
        accuracy: 28,
        battery: 43,
        status: "offline",
        address: "Koregaon Park, Pune, Maharashtra, India",
        last_update: "Yesterday, 05:15 PM"
    },
    {
        employee_id: 5,
        employee_code: "EMP1005",
        name: "Vikash Yadav",
        department: "Operations",
        designation: "Store Executive",
        mobile: "98XXXXXX67",
        latitude: 18.5208,
        longitude: 73.8412,
        accuracy: 18,
        battery: 56,
        status: "offline",
        address: "Shivajinagar, Pune, Maharashtra, India",
        last_update: "Yesterday, 06:01 PM"
    }
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const jitter = (seed) => {
    const value = Math.sin(Date.now() / 45000 + seed) * 0.0008;
    return Number(value.toFixed(7));
};

const getCurrentLocations = async ({ search = "", status = "" } = {}) => {
    const query = String(search || "").trim().toLowerCase();

    return clone(
        DEMO_LOCATIONS
            .filter((employee) => {
                const matchesSearch = !query || [
                    employee.name,
                    employee.employee_code,
                    employee.mobile,
                    employee.department,
                    employee.designation
                ].some((value) => String(value).toLowerCase().includes(query));

                const matchesStatus = !status || employee.status === status;
                return matchesSearch && matchesStatus;
            })
            .map((employee) => ({
                ...employee,
                latitude: Number((employee.latitude + jitter(employee.employee_id)).toFixed(7)),
                longitude: Number((employee.longitude + jitter(employee.employee_id + 7)).toFixed(7)),
                provider: "mock"
            }))
    );
};

const getHistory = async (employeeId, date) => {
    const employee = DEMO_LOCATIONS.find(
        (item) => String(item.employee_id) === String(employeeId)
    );

    if (!employee) return [];

    const points = [
        ["09:05 AM", "Office Check-in", employee.latitude, employee.longitude],
        ["10:30 AM", "Store Visit A", employee.latitude + 0.014, employee.longitude - 0.012],
        ["12:15 PM", "Store Visit B", employee.latitude - 0.009, employee.longitude + 0.018],
        ["01:30 PM", "Lunch Break", employee.latitude + 0.005, employee.longitude + 0.008],
        ["03:15 PM", "Store Visit C", employee.latitude - 0.014, employee.longitude - 0.006],
        ["05:45 PM", "Office Check-out", employee.latitude, employee.longitude]
    ];

    return points.map(([time, label, latitude, longitude], index) => ({
        id: `${employee.employee_id}-${index + 1}`,
        employee_id: employee.employee_id,
        employee_code: employee.employee_code,
        name: employee.name,
        date,
        time,
        label,
        latitude: Number(latitude.toFixed(7)),
        longitude: Number(longitude.toFixed(7)),
        accuracy: employee.accuracy,
        status: "captured"
    }));
};

module.exports = {
    providerName: "mock",
    getCurrentLocations,
    getHistory
};
