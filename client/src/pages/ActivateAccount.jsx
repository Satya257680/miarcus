import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function ActivateAccount() {

    const { token } = useParams();

    const navigate = useNavigate();

    const [password, setPassword] = useState("");

    const [confirmPassword, setConfirmPassword] = useState("");

    const [loading, setLoading] = useState(true);

    const [validToken, setValidToken] = useState(false);

    useEffect(() => {

        validateToken();

    }, []);

    const validateToken = async () => {

        try {

            await axios.get(

                `http://localhost:5000/api/users/activate/${token}`

            );

            setValidToken(true);

        }

        catch {

            alert("Invalid or Expired Activation Link");

        }

        finally {

            setLoading(false);

        }

    };

    const activateAccount = async () => {

        if (!password || !confirmPassword) {

            return alert("Please fill all fields");

        }

        if (password !== confirmPassword) {

            return alert("Passwords do not match");

        }

        try {

            const res = await axios.post(

                "http://localhost:5000/api/users/activate",

                {

                    token,

                    password

                }

            );

            alert(res.data.message);

            navigate("/");

        }

        catch (err) {

            alert(

                err.response?.data?.message ||

                "Activation Failed"

            );

        }

    };

    if (loading) {

        return <h2>Loading...</h2>;

    }

    if (!validToken) {

        return <h2>Invalid Activation Link</h2>;

    }

    return (

        <div style={{

            width:400,

            margin:"80px auto",

            padding:30,

            border:"1px solid #ddd",

            borderRadius:10

        }}>

            <h2>Activate Account</h2>

            <input

                type="password"

                placeholder="Create Password"

                value={password}

                onChange={(e)=>setPassword(e.target.value)}

            />

            <br /><br />

            <input

                type="password"

                placeholder="Confirm Password"

                value={confirmPassword}

                onChange={(e)=>setConfirmPassword(e.target.value)}

            />

            <br /><br />

            <button onClick={activateAccount}>

                Activate Account

            </button>

        </div>

    );

}

export default ActivateAccount;