import React, {
    useEffect,
    useMemo,
    useState
} from "react";

import axios from "axios";

import {
    FaTimes,
    FaStore
} from "react-icons/fa";

import Stepper from "./Stepper";
import BasicInformation from "./BasicInformation";
import FinancialDetails from "./FinancialDetails";
import PossessionDetails from "./PossessionDetails";
import TimelinePreview from "./TimelinePreview";
import ReviewStep from "./reviewStep";
import ProjectSummary from "./ProjectSummary";
import ModalFooter from "./ModalFooter";

import "../../styles/AddNewStoreOpeningModal.css";


/* ======================================================
   API
====================================================== */

const API =
    "https://miarcus-backend.onrender.com/api/new-store-openings";


const TOTAL_STEPS = 5;


/* ======================================================
   INITIAL FORM
====================================================== */

const initialForm = {


    /* ==================================================
       BASIC INFORMATION
    ================================================== */

    location: "",
    city: "",
    sb_area: "",
    carpet_area: "",
    expected_sale: "",

    approver_name: "",
    construction_vendor: "",
    project_taken_by: "",


    /* ==================================================
       FINANCIAL
    ================================================== */

    cam: "",
    mg: "",
    electricity_kva: "",
    revenue_share: "",
    escalation: "",


    /* ==================================================
       POSSESSION
    ================================================== */

    possession_date_loi: "",
    possession_date_broker: "",
    actual_possession_date: "",
    received_by_nso: "",


    /* ==================================================
       ASSIGNMENT
    ================================================== */

    broker_name: "",
    operation_head_assigned: "",
    asm_assigned: "",


    /* ==================================================
       DERIVED
    ================================================== */

    deal_days: "",
    delay_loi_vs_broker: "",
    possession_delay: "",


    /* ==================================================
       TIMELINE
    ================================================== */

    layout_by_nso: "",
    revised_layout_by_nso: "",
    approval_deadline: "",

    visit_by_op_team: "",
    gst_deadline: "",
    hr_hiring_deadline: "",
    team_training_deadline: "",
    visit_by_nso_team_deadline: "",
    plan_of_stock_deadline: "",
    plan_of_collaterals_deadline: "",
    on_field_training_deadline: "",
    dispatch_stock_deadline: "",
    nso_handover_deadline: "",
    vm_handover_deadline: "",
    scanning_deadline: "",
    billing_start_date: "",


    /* ==================================================
       REVIEW
    ================================================== */

    remarks: "",
    attachment: "",


    /* ==================================================
       STATUS
    ================================================== */

    status: "Planning"

};


/* ======================================================
   COMPONENT
====================================================== */

export default function AddNewStoreOpeningModal({

    isOpen,
    onClose,
    onSuccess,
    editData = null

}) {


    /* ==================================================
       CURRENT STEP
    ================================================== */

    const [
        currentStep,
        setCurrentStep
    ] = useState(1);


    /* ==================================================
       LOADING
    ================================================== */

    const [
        loading,
        setLoading
    ] = useState(false);


    /* ==================================================
       ERRORS
    ================================================== */

    const [
        errors,
        setErrors
    ] = useState({});


    /* ==================================================
       NEW ATTACHMENT
    ================================================== */

    const [
        attachment,
        setAttachment
    ] = useState(null);


    /* ==================================================
       EXISTING ATTACHMENT
    ================================================== */

    const [
        existingAttachment,
        setExistingAttachment
    ] = useState(null);


    /* ==================================================
       PREVIEW
    ================================================== */

    const [
        preview,
        setPreview
    ] = useState("");


    /* ==================================================
       FORM DATA
    ================================================== */

    const [
        formData,
        setFormData
    ] = useState(initialForm);


    /* ======================================================
       LOAD DATA
    ====================================================== */

    useEffect(() => {

        if (!isOpen) {
            return;
        }


        setCurrentStep(1);

        setErrors({});


        /* ==================================================
           EDIT
        ================================================== */

        if (editData) {

            const mergedData = {

                ...initialForm,

                ...editData

            };


            setFormData(
                calculateDerivedFields(
                    mergedData
                )
            );


            /*
             * Existing attachment is NOT placed into
             * the new-file state.
             *
             * It is stored separately so the UI can
             * display/view/remove it correctly.
             */

            setAttachment(null);


            setExistingAttachment(
                editData.attachment ||
                editData.attachment_url ||
                editData.file_url ||
                editData.file ||
                null
            );


            setPreview("");

        }

        else {

            setFormData({
                ...initialForm
            });


            setAttachment(null);

            setExistingAttachment(null);

            setPreview("");

        }

    }, [
        isOpen,
        editData
    ]);


    /* ======================================================
       CLEANUP PREVIEW URL
    ====================================================== */

    useEffect(() => {

        return () => {

            if (preview) {

                try {

                    URL.revokeObjectURL(
                        preview
                    );

                }
                catch (error) {

                    console.warn(
                        "Preview cleanup failed:",
                        error
                    );

                }

            }

        };

    }, [
        preview
    ]);


    /* ======================================================
       PROGRESS
    ====================================================== */

    const progress = useMemo(() => {

        return Math.round(

            (
                currentStep /
                TOTAL_STEPS
            ) * 100

        );

    }, [
        currentStep
    ]);


    /* ======================================================
       ADD DAYS
    ====================================================== */

    const addDays = (
        date,
        days
    ) => {

        if (!date) {
            return "";
        }


        const d =
            new Date(
                `${date}T00:00:00`
            );


        if (
            Number.isNaN(
                d.getTime()
            )
        ) {

            return "";

        }


        d.setDate(
            d.getDate() +
            Number(days)
        );


        return d
            .toISOString()
            .split("T")[0];

    };


    /* ======================================================
       DIFFERENCE IN DAYS

       Example:

       LOI    = 01/08
       Broker = 06/08

       Result = 5
    ====================================================== */

    const differenceInDays = (
        start,
        end
    ) => {

        if (!start || !end) {
            return "";
        }


        const startDate =
            new Date(
                `${start}T00:00:00`
            );


        const endDate =
            new Date(
                `${end}T00:00:00`
            );


        if (

            Number.isNaN(
                startDate.getTime()
            )

            ||

            Number.isNaN(
                endDate.getTime()
            )

        ) {

            return "";

        }


        return Math.round(

            (

                endDate.getTime() -
                startDate.getTime()

            )

            /

            (

                1000 *
                60 *
                60 *
                24

            )

        );

    };


    /* ======================================================
       CALCULATE DERIVED FIELDS
    ====================================================== */

    function calculateDerivedFields(data) {

        const updated = {
            ...data
        };


        /* ==================================================
           DEAL DAYS

           Actual Possession - LOI
        ================================================== */

        if (

            updated.possession_date_loi &&

            updated.actual_possession_date

        ) {

            updated.deal_days =
                differenceInDays(

                    updated.possession_date_loi,

                    updated.actual_possession_date

                );

        }

        else {

            updated.deal_days = "";

        }


        /* ==================================================
           DELAY LOI VS BROKER

           Broker - LOI
        ================================================== */

        if (

            updated.possession_date_loi &&

            updated.possession_date_broker

        ) {

            updated.delay_loi_vs_broker =
                differenceInDays(

                    updated.possession_date_loi,

                    updated.possession_date_broker

                );

        }

        else {

            updated.delay_loi_vs_broker = "";

        }


        /* ==================================================
           POSSESSION DELAY

           Actual - LOI
        ================================================== */

        if (

            updated.possession_date_loi &&

            updated.actual_possession_date

        ) {

            updated.possession_delay =
                differenceInDays(

                    updated.possession_date_loi,

                    updated.actual_possession_date

                );

        }

        else {

            updated.possession_delay = "";

        }


        /* ==================================================
           TIMELINE BASE DATE

           Priority:

           Actual
              ↓
           Broker
              ↓
           LOI
        ================================================== */

        const possessionDate =

            updated.actual_possession_date ||

            updated.possession_date_broker ||

            updated.possession_date_loi;


        if (!possessionDate) {

            return updated;

        }


        /* ==================================================
           PLANNING
        ================================================== */

        updated.layout_by_nso =
            addDays(
                possessionDate,
                2
            );


        updated.revised_layout_by_nso =
            addDays(
                updated.layout_by_nso,
                2
            );


        /* ==================================================
           APPROVAL
        ================================================== */

        updated.approval_deadline =
            addDays(
                updated.revised_layout_by_nso,
                3
            );


        /* ==================================================
           OPERATION
        ================================================== */

        updated.visit_by_op_team =
            addDays(
                updated.approval_deadline,
                5
            );


        /* ==================================================
           GST
        ================================================== */

        updated.gst_deadline =
            addDays(
                updated.visit_by_op_team,
                2
            );


        /* ==================================================
           HR
        ================================================== */

        updated.hr_hiring_deadline =
            addDays(
                updated.gst_deadline,
                2
            );


        /* ==================================================
           TRAINING
        ================================================== */

        updated.team_training_deadline =
            addDays(
                updated.hr_hiring_deadline,
                7
            );


        updated.visit_by_nso_team_deadline =
            addDays(
                updated.team_training_deadline,
                0
            );


        /* ==================================================
           STORE READY
        ================================================== */

        updated.plan_of_stock_deadline =
            addDays(
                updated.visit_by_nso_team_deadline,
                5
            );


        updated.plan_of_collaterals_deadline =
            addDays(
                updated.plan_of_stock_deadline,
                0
            );


        updated.on_field_training_deadline =
            addDays(
                updated.plan_of_collaterals_deadline,
                5
            );


        /* ==================================================
           FINAL HANDOVER
        ================================================== */

        updated.dispatch_stock_deadline =
            addDays(
                updated.on_field_training_deadline,
                5
            );


        updated.nso_handover_deadline =
            addDays(
                updated.dispatch_stock_deadline,
                4
            );


        updated.vm_handover_deadline =
            addDays(
                updated.nso_handover_deadline,
                0
            );


        updated.scanning_deadline =
            addDays(
                updated.vm_handover_deadline,
                0
            );


        updated.billing_start_date =
            addDays(
                updated.scanning_deadline,
                5
            );


        return updated;

    }


    /* ======================================================
       INPUT CHANGE
    ====================================================== */

    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;


        setFormData(prev => {

            const updated = {

                ...prev,

                [name]: value

            };


            return calculateDerivedFields(
                updated
            );

        });


        setErrors(prev => ({

            ...prev,

            [name]: ""

        }));

    };


    /* ======================================================
       FILE CHANGE
    ====================================================== */

    const handleFileChange = (e) => {

        const file =
            e.target.files?.[0];


        if (!file) {
            return;
        }


        /* ==================================================
           REMOVE OLD EXISTING ATTACHMENT FROM VIEW
        ================================================== */

        setExistingAttachment(null);


        /* ==================================================
           STORE NEW FILE
        ================================================== */

        setAttachment(file);


        setFormData(prev => ({

            ...prev,

            attachment: file.name

        }));


        /* ==================================================
           IMAGE PREVIEW
        ================================================== */

        if (

            file.type &&

            file.type.includes("image")

        ) {

            setPreview(
                URL.createObjectURL(file)
            );

        }

        else {

            setPreview("");

        }


        setErrors(prev => ({

            ...prev,

            attachment: ""

        }));

    };


    /* ======================================================
       REMOVE ATTACHMENT
    ====================================================== */

    const removeAttachment = () => {

        setAttachment(null);

        setExistingAttachment(null);

        setPreview("");


        setFormData(prev => ({

            ...prev,

            attachment: ""

        }));

    };


    /* ======================================================
       SUBMIT
    ====================================================== */

    const handleSubmit = async () => {

        try {

            setLoading(true);

            setErrors({});


            /* ==================================================
               FINAL FORM DATA
            ================================================== */

            const finalData =
                calculateDerivedFields(
                    formData
                );


            /* ==================================================
               FORM DATA
            ================================================== */

            const form =
                new FormData();


            Object.keys(finalData).forEach(
                key => {

                    /*
                     * Do not append the attachment
                     * string as a file.
                     *
                     * The actual new File object is
                     * appended separately below.
                     */

                    if (
                        key === "attachment"
                    ) {

                        return;

                    }


                    form.append(

                        key,

                        finalData[key] ?? ""

                    );

                }
            );


            /* ==================================================
               NEW FILE
            ================================================== */

            if (attachment) {

                form.append(

                    "attachment",

                    attachment

                );

            }


            /* ==================================================
               EDIT
            ================================================== */

            if (editData) {

                await axios.put(

                    `${API}/${editData.id}`,

                    form,

                    {
                        headers: {
                            "Content-Type":
                                "multipart/form-data"
                        }
                    }

                );

            }

            /* ==================================================
               CREATE
            ================================================== */

            else {

                await axios.post(

                    API,

                    form,

                    {
                        headers: {
                            "Content-Type":
                                "multipart/form-data"
                        }
                    }

                );

            }


            /* ==================================================
               SUCCESS
            ================================================== */

            if (onSuccess) {

                onSuccess();

            }


            onClose();

        }

        catch (error) {

            console.error(

                "NEW STORE OPENING SAVE ERROR:",

                error

            );


            const message =

                error.response?.data?.message ||

                error.response?.data?.error ||

                "Failed to save New Store Opening";


            setErrors({

                submit: message

            });


            alert(message);

        }

        finally {

            setLoading(false);

        }

    };


    /* ======================================================
       CLOSED
    ====================================================== */

    if (!isOpen) {

        return null;

    }


    /* ======================================================
       RENDER
    ====================================================== */

    return (

        <div className="nso-overlay">


            <div className="nso-modal">


                {/* ==================================================
                   HEADER
                ================================================== */}

                <div className="nso-header">


                    <div className="header-left">


                        <div className="header-icon">

                            <FaStore />

                        </div>


                        <div>

                            <h2>

                                {
                                    editData

                                        ? "Edit New Store Opening"

                                        : "Add New Store Opening"
                                }

                            </h2>


                            <p>

                                Manage retail expansion projects

                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="close-btn"
                        onClick={onClose}
                        disabled={loading}
                        aria-label="Close modal"
                    >

                        <FaTimes />

                    </button>


                </div>


                {/* ==================================================
                   STEPPER
                ================================================== */}

                <Stepper

                    currentStep={currentStep}

                    onStepChange={setCurrentStep}

                />


                {/* ==================================================
                   BODY
                ================================================== */}

                <div className="nso-body">


                    {/* ==================================================
                       LEFT
                    ================================================== */}

                    <div className="nso-left">


                        {/* ==================================================
                           STEP 1
                        ================================================== */}

                        {
                            currentStep === 1 && (

                                <BasicInformation

                                    formData={formData}

                                    handleChange={
                                        handleChange
                                    }

                                    errors={errors}

                                />

                            )
                        }


                        {/* ==================================================
                           STEP 2
                        ================================================== */}

                        {
                            currentStep === 2 && (

                                <FinancialDetails

                                    formData={formData}

                                    handleChange={
                                        handleChange
                                    }

                                    errors={errors}

                                />

                            )
                        }


                        {/* ==================================================
                           STEP 3
                        ================================================== */}

                        {
                            currentStep === 3 && (

                                <PossessionDetails

                                    formData={formData}

                                    handleChange={
                                        handleChange
                                    }

                                    errors={errors}

                                />

                            )
                        }


                        {/* ==================================================
                           STEP 4
                        ================================================== */}

                        {
                            currentStep === 4 && (

                                <TimelinePreview

                                    formData={formData}

                                    handleChange={
                                        handleChange
                                    }

                                />

                            )
                        }


                        {/* ==================================================
                           STEP 5
                        ================================================== */}

                        {
                            currentStep === 5 && (

                                <ReviewStep

                                    formData={formData}

                                    attachment={
                                        attachment
                                    }

                                    existingAttachment={
                                        existingAttachment
                                    }

                                    preview={
                                        preview
                                    }

                                    onFileChange={
                                        handleFileChange
                                    }

                                    onRemoveFile={
                                        removeAttachment
                                    }

                                    handleChange={
                                        handleChange
                                    }

                                    errors={
                                        errors
                                    }

                                />

                            )
                        }


                    </div>


                    {/* ==================================================
                       RIGHT SUMMARY
                    ================================================== */}

                    <div className="nso-right">

                        <ProjectSummary

                            formData={formData}

                            progress={progress}

                            currentStep={currentStep}

                        />

                    </div>


                </div>


                {/* ==================================================
                   FOOTER
                ================================================== */}

                <ModalFooter

                    currentStep={currentStep}

                    setCurrentStep={setCurrentStep}

                    totalSteps={TOTAL_STEPS}

                    onClose={onClose}

                    onSubmit={handleSubmit}

                    loading={loading}

                />


            </div>

        </div>

    );

}