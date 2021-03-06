import { createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import profileDB from '../../db/profileDB';
import supplyDB from '../../db/supplyDB';

export const cryptocurrencySlice = createSlice({
  name: 'cryptocurrency',
  initialState: {
    id: null,
    profile: null,
    chart: null,
    range: null,
    tickers: null,
    loading: true,
  },
  reducers: {
    setID: (state, action) => {
      state.id = action.payload;
    },
    fetchProfile: (state, action) => {
      state.profile = action.payload;
    },
    fetchChart: (state, action) => {
      state.chart = action.payload;
    },
    setRange: (state, action) => {
      state.range = action.payload;
    },
    fetchTickers: (state, action) => {
      state.tickers = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    resetDetails: (state) => {
      state.profile = null;
      state.chart = null;
      state.tickers = null;
    },
  },
});

export const {
  setID,
  fetchProfile,
  fetchChart,
  setRange,
  fetchTickers,
  setLoading,
  resetDetails,
} = cryptocurrencySlice.actions;

export const fetchCryptoProfile = (id) => async (dispatch) => {
  dispatch(setID(id));
  let profile;
  let tickers = [];
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${id}?localization=false&community_data=false&developer_data=false&include_exchange_logo=true`
    );
    profile = {
      id: res.data.id,
      symbol: res.data.symbol,
      name: res.data.name,
      description: res.data.description.en,
      website: res.data.links.homepage[0],
      explorer: res.data.links.blockchain_site[0],
      forum: res.data.links.official_forum_url[0],
      chat: res.data.links.chat_url[0],
      announcement: res.data.links.announcement_url[0],
      twitter: res.data.links.twitter_screen_name,
      facebook: res.data.links.facebook_username,
      telegram: res.data.links.telegram_channel_identifier,
      reddit: res.data.links.subreddit_url,
      github: res.data.links.repos_url.github[0],
      image: res.data.image.large,
      market_cap_rank: res.data.market_cap_rank,
      current_price: res.data.market_data.current_price.usd,
      ath: res.data.market_data.ath.usd,
      ath_change_percentage: res.data.market_data.ath_change_percentage.usd,
      ath_date: res.data.market_data.ath_date.usd,
      atl: res.data.market_data.atl.usd,
      atl_change_percentage: res.data.market_data.atl_change_percentage.usd,
      atl_date: res.data.market_data.atl_date.usd,
      market_cap: res.data.market_data.market_cap.usd,
      total_volume: res.data.market_data.total_volume.usd,
      high_24h: res.data.market_data.high_24h.usd,
      low_24h: res.data.market_data.low_24h.usd,
      price_change_percentage_24h:
        res.data.market_data.price_change_percentage_24h,
      price_change_percentage_7d:
        res.data.market_data.price_change_percentage_7d,
      circulating_supply:
        res.data.market_data.circulating_supply || supplyDB[id],
    };
    tickers = res.data.tickers.map((ticker) => ({
      base: ticker.base,
      target: ticker.target,
      exchange: ticker.market.name,
      exchange_id: ticker.market.identifier,
      exchange_logo: ticker.market.logo,
      price: ticker.converted_last.usd,
      volume: ticker.converted_volume.usd,
      spread: ticker.bid_ask_spread_percentage,
      last_traded_at: ticker.last_traded_at,
      trade_url: ticker.trade_url,
    }));
  } catch (err) {
    console.log(err.message);
    if (!profileDB[id]) return;
    profile = profileDB[id].profile;
    const exchanges = profileDB[id].exchanges;
    try {
      const res1 = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`
      );
      const { usd, usd_market_cap, usd_24h_vol, usd_24h_change } = res1.data[
        id
      ];
      profile = {
        ...profile,
        current_price: usd,
        market_cap: usd_market_cap,
        total_volume: usd_24h_vol,
        price_change_percentage_24h: usd_24h_change,
      };

      if (exchanges.length === 0) return;
      const promises = exchanges.map((ex) =>
        axios.get(
          `https://api.coingecko.com/api/v3/exchanges/${ex}/tickers?coin_ids=${id}&include_exchange_logo=true&page=1&order=volume_desc`
        )
      );
      const resArr = await Promise.all(promises);
      resArr.forEach((r) => {
        r.data.tickers.forEach((t) =>
          tickers.push({
            base: t.base,
            target: t.target,
            exchange: t.market.name,
            exchange_id: t.market.identifier,
            exchange_logo: t.market.logo,
            price: t.converted_last.usd,
            volume: t.converted_volume.usd,
            spread: t.bid_ask_spread_percentage,
            last_traded_at: t.last_traded_at,
            trade_url: t.trade_url,
          })
        );
      });
    } catch (err) {
      console.log(err.message);
    }
  } finally {
    dispatch(fetchProfile(profile));
    dispatch(fetchTickers(tickers));
    dispatch(setLoading(false));
  }
};

export const fetchCryptoChart = (id, range) => async (dispatch) => {
  dispatch(setRange(range));
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${range}`
    );
    const data = {
      prices: res.data.prices.map((price) => ({ x: price[0], y: price[1] })),
      market_caps: res.data.market_caps.map((mrket_cap) => ({
        x: mrket_cap[0],
        y: mrket_cap[1],
      })),
      total_volumes: res.data.total_volumes.map((total_volume) => ({
        x: total_volume[0],
        y: total_volume[1],
      })),
    };
    dispatch(fetchChart(data));
  } catch (err) {
    console.log(err.message);
  }
};

export const fetchCryptoTickers = (id) => async (dispatch) => {
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/coins/${id}/tickers?include_exchange_logo=true`
    );
    const data = res.data.tickers.map((ticker) => ({
      base: ticker.base,
      target: ticker.target,
      exchange: ticker.market.name,
      exchange_id: ticker.market.identifier,
      exchange_logo: ticker.market.logo,
      price: ticker.converted_last.usd,
      volume: ticker.converted_volume.usd,
      spread: ticker.bid_ask_spread_percentage,
      last_traded_at: ticker.last_traded_at,
      trade_url: ticker.trade_url,
    }));
    dispatch(fetchTickers(data));
  } catch (err) {
    console.log(err.message);
  }
};

export const selectCryptoID = (state) => state.cryptocurrency.id;
export const selectCryptoProfile = (state) => state.cryptocurrency.profile;
export const selectCryptoChart = (state) => state.cryptocurrency.chart;
export const selectCryptoChartRange = (state) => state.cryptocurrency.range;
export const selectCryptoTickers = (state) => state.cryptocurrency.tickers;
export const selectLoading = (state) => state.cryptocurrency.loading;

export default cryptocurrencySlice.reducer;
