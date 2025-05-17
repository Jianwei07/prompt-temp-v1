    import axios from "axios";
import { useEffect, useState } from "react";

    export const useAppCodes = (department: string) => {
    const [appCodes, setAppCodes] = useState<string[]>([]);

    useEffect(() => {
        if (!department) return;

        const fetch = async () => {
        const res = await axios.get<Array<{ AppCode: string }>>(`/api/metadata/${department}`);
        const codes = res.data.map((entry) => entry.AppCode);
        setAppCodes(codes);
        };

        fetch().catch(console.error);
    }, [department]);

    return appCodes;
    };
