//INTERFACES DE COMPOONENTES
export interface DDialog {
    header: string,
    message: string,
    question: string
    buttonYes: string,
    buttonNo: string
}

export interface Pagination{
    search: string;
    length: number;
    pageSize: number;
    pageIndex: number;
    pageSizeOptions: number[];
}

export interface Login {
    username: string,
    pwd: string
}

export interface ResponseGet {
    status:  number;
    message: string;
    data: any;
}