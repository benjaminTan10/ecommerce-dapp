import { createSlice } from '@reduxjs/toolkit';

const marketData = { inSaleItems: [], BoughtItems: [], store: "" }

export const marketSlice = createSlice({
    name: "market",
    initialState: { value: marketData },
    reducers: {
        getUserData: (state, action) => {
            state.value = action.payload
        },
    },
}
)

export default marketSlice.reducer;

export const { getUserData } = marketSlice.actions;