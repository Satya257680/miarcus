import axios from "axios";


const API = "http://localhost:5000/api/nso-rules";



// ======================================================
// AUTH CONFIG
// ======================================================

const authConfig = () => {


    return {

        headers: {

            Authorization:

            `Bearer ${localStorage.getItem("token")}`

        }

    };


};





// ======================================================
// GET ALL NSO RULES
// SEARCH + PAGINATION
// ======================================================

export const getRules = async (

    search = "",

    page = 1,

    limit = 10

) => {


    const response = await axios.get(

        API,

        {

            ...authConfig(),


            params: {


                search,

                page,

                limit


            }


        }

    );


    return response.data;


};







// ======================================================
// GET RULE BY ID
// ======================================================

export const getRuleById = async(id)=>{


    const response = await axios.get(

        `${API}/${id}`,

        authConfig()

    );


    return response.data;


};







// ======================================================
// CREATE NSO RULE
// ======================================================

export const createRule = async(data)=>{


    const response = await axios.post(

        API,

        data,

        authConfig()

    );


    return response.data;


};







// ======================================================
// UPDATE NSO RULE
// ======================================================

export const updateRule = async(

    id,

    data

)=>{


    const response = await axios.put(

        `${API}/${id}`,

        data,

        authConfig()

    );


    return response.data;


};







// ======================================================
// DELETE SINGLE NSO RULE
// ======================================================

export const deleteRule = async(id)=>{


    const response = await axios.delete(

        `${API}/${id}`,

        authConfig()

    );


    return response.data;


};







// ======================================================
// DELETE ALL NSO RULES
// ======================================================

export const deleteAllRules = async()=>{


    const response = await axios.delete(

        `${API}/delete-all`,

        authConfig()

    );


    return response.data;


};







// ======================================================
// BULK UPLOAD NSO RULES
// EXCEL
// ======================================================

export const bulkUploadRules = async(file)=>{


    const formData = new FormData();



    formData.append(

        "file",

        file

    );



    const response = await axios.post(

        `${API}/bulk-upload`,

        formData,

        {

            headers:{


                Authorization:

                `Bearer ${localStorage.getItem("token")}`,


                "Content-Type":

                "multipart/form-data"


            }


        }

    );



    return response.data;


};







// ======================================================
// EXPORT NSO RULES CSV
// ======================================================

export const exportRules = async()=>{


    const response = await axios.get(

        `${API}/export`,

        {


            ...authConfig(),


            responseType:"blob"


        }

    );



    return response;


};