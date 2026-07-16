import apiHandler from '../store/api/apiHandler';

const BASE_URL = '/godown-slips';

export const uploadGodownSlips = (formData) => {
    return apiHandler({
        method: 'POST',
        url: `${BASE_URL}/upload`,
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        successMessage: 'Slips uploaded successfully!',
        errorMessage: 'Failed to upload slips',
    });
};

export const fetchAdminGodownSlips = (params = {}) => {
    return apiHandler({
        method: 'GET',
        url: `${BASE_URL}/all`,
        params,
        showNotification: false,
    });
};

export const fetchUserGodownSlips = (params = {}) => {
    return apiHandler({
        method: 'GET',
        url: `${BASE_URL}`,
        params,
        showNotification: false,
    });
};

export const reviewGodownSlip = (slipId, payload) => {
    return apiHandler({
        method: 'PATCH',
        url: `${BASE_URL}/${slipId}/review`,
        data: payload,
        successMessage: 'Slip review saved successfully!',
        errorMessage: 'Failed to save slip review',
    });
};
