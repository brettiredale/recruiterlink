-- Gives every US, Canadian and Australian city its state, province or
-- territory. States came from Google Places (city predictions, then a lookup
-- of each agency where a city name is used in more than one state). Agencies
-- that Google placed in a different state from the rest of their city move to
-- a new city for that state ("Arlington" TX keeps its page, Arlington VA gets
-- its own).

update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'AU' and r.code = 'SA' and c.country_id = co.id and c.id in (1,18,19,28,33,34);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'AU' and r.code = 'QLD' and c.country_id = co.id and c.id in (2,11,14,17,22,32,38,39,41,42);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'AU' and r.code = 'NSW' and c.country_id = co.id and c.id in (3,4,5,6,8,9,16,20,23,24,29,30,35,40,43);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'AU' and r.code = 'VIC' and c.country_id = co.id and c.id in (7,10,15,21,25,26,27,37);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'AU' and r.code = 'WA' and c.country_id = co.id and c.id in (12,13,31,36);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'BC' and c.country_id = co.id and c.id in (234,244,250,253,255,272,273,278,280,281,288,300,308,313,329,334,337,338,343,346);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'ON' and c.country_id = co.id and c.id in (235,236,237,238,239,240,243,246,251,262,264,265,267,268,274,276,286,289,290,291,293,297,298,299,301,302,303,304,305,307,311,328,332,333,336,339,341,342,345,347,349);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'NS' and c.country_id = co.id and c.id in (241,254,260,266);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'QC' and c.country_id = co.id and c.id in (242,248,249,257,261,269,270,275,277,282,283,285,287,292,295,296,306,309,312,314,315,316,318,319,320,321,322,323,324,326,331,335,344);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'AB' and c.country_id = co.id and c.id in (245,252,258,259,263,279,284,327,340);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'NB' and c.country_id = co.id and c.id in (247,256,294);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'NU' and c.country_id = co.id and c.id in (271);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'SK' and c.country_id = co.id and c.id in (310,325,330);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'NL' and c.country_id = co.id and c.id in (317);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'CA' and r.code = 'MB' and c.country_id = co.id and c.id in (348);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'PA' and c.country_id = co.id and c.id in (2115,2129,2131,2136,2172,2179,2187,2192,2196,2197,2217,2221,2222,2232,2241,2243,2258,2273,2282,2297,2307,2313,2321,2322,2351,2354,2360,2361,2362,2365,2380,2381,2387,2400,2406,2410,2414,2420,2428,2439,2448,2478,2484,2499,2503,2516,2517,2520,2522,2529,2546,2576,2580,2582,2594,2607,2608,2610,2616,2625,2629,2660,2684,2686,2688,2695,2715,2719,2727,2736,2752,2757,2766,2768,2780,2781,2786,2796,2809,2815,2830,2837,2851,2853,2857,2859,2860,2866,2893,2894,2901,2904,2987,2993,3003,3015,3021,3032,3039,3055,3076,3095,3097,3100,3103,3111,3118,3120,3131,3138,3160,3162);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'MA' and c.country_id = co.id and c.id in (2116,2133,2164,2188,2200,2201,2205,2214,2240,2244,2269,2277,2296,2338,2344,2369,2377,2386,2421,2423,2452,2453,2460,2490,2497,2515,2519,2537,2540,2544,2549,2623,2648,2650,2664,2666,2671,2673,2675,2679,2690,2699,2707,2711,2753,2759,2760,2764,2774,2779,2787,2788,2797,2799,2802,2803,2843,2848,2861,2865,2881,2892,2921,2931,2933,2944,2988,2989,2997,3010,3014,3028,3029,3042,3058,3072,3090,3092,3093,3107,3115,3124,3126,3129,3137,3150,3157);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'GA' and c.country_id = co.id and c.id in (2117,2124,2130,2153,2154,2156,2161,2223,2226,2250,2309,2320,2330,2333,2335,2343,2346,2357,2364,2366,2382,2417,2438,2442,2467,2483,2496,2547,2567,2569,2575,2595,2619,2656,2668,2682,2776,2784,2844,2845,2907,2927,2929,2943,2961,2963,2975,2994,2995,3038,3049,3050,3068,3108,3156);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'OK' and c.country_id = co.id and c.id in (2118,2142,2213,2393,2813);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'TX' and c.country_id = co.id and c.id in (2119,2143,2158,2167,2169,2171,2199,2220,2230,2245,2306,2311,2334,2352,2397,2424,2437,2443,2449,2472,2548,2551,2563,2571,2574,2590,2708,2863,2930,2946,2957,3007,3011,3012,3017,3033,3043,3048,3056,3071);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'MI' and c.country_id = co.id and c.id in (2120,2134,2155,2165,2182,2190,2193,2194,2211,2219,2233,2234,2266,2285,2287,2302,2342,2350,2373,2376,2426,2429,2435,2454,2491,2493,2502,2518,2539,2550,2557,2564,2570,2573,2602,2611,2612,2634,2649,2654,2657,2672,2694,2725,2763,2798,2800,2806,2867,2918,2932,2939,2940,2986,3005,3006,3025,3026,3064,3066,3078,3096,3105,3110,3117,3133,3135,3149,3164,3165);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'CA' and c.country_id = co.id and c.id in (2121,2123,2127,2132,2137,2139,2140,2141,2145,2160,2168,2178,2181,2189,2206,2207,2212,2227,2235,2237,2238,2239,2242,2246,2248,2253,2257,2276,2278,2279,2281,2294,2303,2304,2315,2316,2317,2318,2319,2329,2331,2332,2336,2337,2339,2345,2353,2355,2359,2363,2394,2395,2396,2398,2401,2405,2407,2411,2440,2451,2461,2462,2465,2469,2471,2477,2481,2485,2494,2495,2509,2513,2523,2527,2535,2553,2554,2559,2561,2562,2577,2586,2587,2588,2589,2591,2592,2596,2597,2598,2599,2601,2614,2632,2635,2636,2639,2641,2642,2643,2653,2659,2665,2669,2693,2713,2716,2723,2724,2728,2730,2739,2740,2749,2750,2754,2777,2801,2805,2808,2812,2817,2819,2825,2827,2829,2831,2832,2840,2850,2864,2870,2872,2885,2886,2887,2888,2889,2896,2897,2898,2899,2900,2911,2913,2922,2925,2926,2928,2935,2945,2947,2948,2949,2950,2951,2952,2953,2954,2955,2956,2958,2959,2960,2964,2965,2966,2967,2968,2969,2970,2973,2979,2991,2996,2998,3002,3019,3020,3027,3036,3044,3046,3052,3059,3062,3063,3067,3070,3080,3086,3087,3091,3114,3121,3122,3127,3154,3161);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'FL' and c.country_id = co.id and c.id in (2122,2159,2198,2289,2312,2341,2445,2447,2530,2565,2579,2613,2620,2700,2701,2702,2703,2717,2756,2770,2794,2820,2821,2826,2828,2838,2846,2871,2938,2971,3041,3113,3148);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'VA' and c.country_id = co.id and c.id in (2125,2126,2149,2184,2191,2228,2261,2265,2271,2272,2328,2418,2422,2458,2464,2479,2512,2521,2526,2528,2543,2622,2663,2683,2687,2710,2769,2778,2783,2785,2880,2882,2903,2906,2915,2962,3023,3024,3054,3073,3082,3085,3098,3140,3144,3151);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'NJ' and c.country_id = co.id and c.id in (2128,2148,2163,2166,2174,2180,2183,2208,2209,2210,2236,2268,2270,2283,2291,2293,2299,2323,2324,2325,2358,2372,2375,2379,2384,2385,2388,2390,2392,2399,2409,2412,2413,2415,2416,2419,2433,2436,2446,2456,2459,2504,2505,2506,2510,2511,2534,2536,2538,2542,2568,2583,2606,2618,2627,2630,2633,2658,2661,2662,2670,2677,2691,2709,2714,2726,2729,2733,2734,2737,2742,2746,2748,2761,2762,2767,2773,2790,2791,2814,2818,2835,2839,2841,2842,2849,2858,2862,2869,2877,2884,2890,2895,2909,2910,2916,2919,2934,2936,2937,2976,2978,2990,2999,3001,3009,3031,3034,3047,3053,3057,3060,3065,3074,3075,3083,3088,3123,3125,3130,3152,3153,3155);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'MD' and c.country_id = co.id and c.id in (2135,2162,2170,2177,2186,2203,2254,2274,2295,2300,2327,2349,2403,2404,2430,2457,2468,2475,2480,2482,2507,2508,2514,2555,2556,2566,2609,2617,2652,2706,2712,2804,2811,2823,2824,2854,2902,2912,2923,2982,2992,3040,3061,3077);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'NC' and c.country_id = co.id and c.id in (2138,2150,2151,2176,2229,2247,2249,2251,2262,2264,2305,2314,2340,2368,2427,2434,2455,2473,2474,2498,2500,2525,2532,2533,2541,2545,2552,2558,2578,2584,2626,2645,2651,2678,2685,2722,2738,2741,2743,2744,2745,2747,2765,2775,2855,2856,2868,2883,2924,2984,2985,3004,3008,3079,3102,3109,3136,3143,3147,3158);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'IL' and c.country_id = co.id and c.id in (2144,2157,2173,2185,2225,2275,2378,2402,2655,2680,2751,2755,2789,2793,2807,2816,2847,2914,2920,3119);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'CO' and c.country_id = co.id and c.id in (2146,2147,2152,2202,2218,2252,2256,2298,2347,2367,2408,2431,2444,2486,2492,2501,2605,2631,2638,2640,2647,2732,2782,2836,3051,3128,3145);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'NY' and c.country_id = co.id and c.id in (2175,2224,2371,2374,2383,2470,2628,2676,2696,2771,2772,2876,2917,2972,3094,3101,3116,3134,3141);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'MN' and c.country_id = co.id and c.id in (2195,2216,2231,2260,2267,2310,2326,2370,2389,2391,2463,2487,2531,2600,2603,2604,2667,2692,2720,2721,2795,2822,2878,2941,2942,2974,2983,3013,3016,3084,3089,3112,3142,3146,3159);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'KY' and c.country_id = co.id and c.id in (2204,2624,2637,2646);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'MS' and c.country_id = co.id and c.id in (2215,2441,2681,3081);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'AZ' and c.country_id = co.id and c.id in (2255,2259,2432,2450,2476,2488,2581,2697,2735,2834,2852,2875,2879,2977,2981,3035,3037,3045,3069,3139);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'SC' and c.country_id = co.id and c.id in (2263,2489,2792,3099);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'OH' and c.country_id = co.id and c.id in (2280,2290,2301,2689,3030,3163);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'WV' and c.country_id = co.id and c.id in (2284,2644,2891,2908,3000,3132);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'TN' and c.country_id = co.id and c.id in (2286,2585);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'DE' and c.country_id = co.id and c.id in (2288);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'IA' and c.country_id = co.id and c.id in (2292,3106);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'AR' and c.country_id = co.id and c.id in (2308);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'KS' and c.country_id = co.id and c.id in (2348);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'AL' and c.country_id = co.id and c.id in (2356,2621,2731);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'NM' and c.country_id = co.id and c.id in (2425);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'MO' and c.country_id = co.id and c.id in (2466,2572,2674,2810,3022);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'NV' and c.country_id = co.id and c.id in (2524,2615);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'IN' and c.country_id = co.id and c.id in (2560,2833);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'LA' and c.country_id = co.id and c.id in (2593,2698);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'WI' and c.country_id = co.id and c.id in (2718);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'NH' and c.country_id = co.id and c.id in (2758,2874);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'OR' and c.country_id = co.id and c.id in (2873);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'WA' and c.country_id = co.id and c.id in (2905,2980);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'CT' and c.country_id = co.id and c.id in (3018);
update public.cities c set region_id = r.id from public.regions r join public.countries co on co.id = r.country_id
where co.iso2 = 'US' and r.code = 'DC' and c.country_id = co.id and c.id in (3104);

-- New cities for agencies in a second state of the same city name.
create temporary table city_splits (city_id integer, code text, agency_ids uuid[]) on commit drop;
insert into city_splits values
  (2142, 'PA', array['ad0c745a-d566-4a27-a6a3-f44b697e1448']::uuid[]),
  (2143, 'VA', array['9ea377cb-22cc-4e26-beb5-4b2cb3b7b0cf','0673719f-2ff7-4c8e-babe-e682a2aed402','84cd0760-2f74-4e9f-afcf-91ca3df729c8','71a0218f-0794-4801-ab63-8654de86a975','722ded33-39a0-4c9b-9bec-3ef60ff3d0d5','5b90fb66-fb65-4be5-ad08-4504373fe60c','c58ccc47-47d4-40ff-88fb-eecf82f4917b','59a111a1-eb10-49cf-81e6-c226583dd398','2d0aec5f-5ecd-44a3-b98f-cdf0fd1d0b9b','367fe5c2-3432-4e87-9b86-2d2ff06fea20','177822d8-0967-4afc-866c-9cf0aa4efae0']::uuid[]),
  (2157, 'CO', array['ac194fe7-d65c-4a94-b8fb-4a0fc44719e6','2e892a36-e9ae-49d5-bd14-1e731450a4bb','1bc7073a-91d4-48e2-9492-1e9476127cc9','b5e942cc-0f43-4555-9257-b0f960a23c82','675394bc-5fe5-4279-915c-e1ea94987048']::uuid[]),
  (2185, 'PA', array['1ef2156b-ef2a-4261-8149-57d5b15e8772']::uuid[]),
  (2189, 'MI', array['e2850cde-4ff2-4cb5-9aec-427fb1492092','7a645f5b-e617-4c43-b1bc-591f1a378b01','a507f34e-9421-433d-8722-d82fd397b7d1']::uuid[]),
  (2300, 'SC', array['c6aff7ec-640f-4def-85a7-a5eb688ab185','98f52c54-e756-4089-b94d-90a3c8ef757c']::uuid[]),
  (2301, 'GA', array['232c10ca-44ca-4268-bde6-9936864ab505']::uuid[]),
  (2364, 'MN', array['6b0ac2c1-91cc-41ed-8a64-77eb99d75289','91235f29-4a65-4b4f-bf65-683681a7e987']::uuid[]),
  (2448, 'MD', array['bd588eb7-6e88-4158-82bd-d31532807f58']::uuid[]),
  (2467, 'VA', array['cf547097-449d-4c36-9ff7-ac13664eb79a']::uuid[]),
  (2481, 'AZ', array['fda88a0e-39fa-4598-9673-b9e86547bbdf']::uuid[]),
  (2624, 'MA', array['987ab21e-20e6-4e56-a367-fef96075c6af']::uuid[]),
  (2646, 'CO', array['77ad103a-f582-4085-99a4-baa89e50cd2b']::uuid[]),
  (2729, 'CA', array['1ae95d2a-d6c1-4e1d-8d87-888d51fc2814']::uuid[]),
  (2773, 'CA', array['3f977b3e-d059-48db-bf5e-5a9104c47f60','b3eb6185-c834-444b-85b2-776ca8337097']::uuid[]),
  (2847, 'AZ', array['4fae13b4-35a1-4a75-b9f3-fd63861c8b36']::uuid[]),
  (2865, 'MI', array['cc6459f1-c434-4c2b-bc38-95cd44952327']::uuid[]),
  (2893, 'MA', array['1d3a5b94-27f7-45be-84be-40a7f95ebb74']::uuid[]),
  (2906, 'KY', array['6bfc2392-4c1d-43c8-8a6b-6117d2f0145d']::uuid[]),
  (2928, 'MI', array['b73e81d8-ff21-412d-8d79-26e8e888e834']::uuid[]),
  (2929, 'NM', array['f0ee2eb0-3591-489a-8825-048c42fca687']::uuid[]),
  (3078, 'NY', array['8f51b947-911f-4053-bf47-0b88e8ca7187']::uuid[]),
  (3111, 'NJ', array['5d2e8570-af95-4ac9-872b-e9393125af86']::uuid[]),
  (3143, 'MA', array['f5a40e4a-e81b-4742-ae8d-bc03967dcfc8']::uuid[]);

do $$
declare
  s record;
  base text;
  new_slug text;
  n integer;
  new_city integer;
begin
  for s in
    select sp.*, c.name, c.country_id, r.id as region_id
    from city_splits sp
    join public.cities c on c.id = sp.city_id
    join public.regions r on r.country_id = c.country_id and r.code = sp.code
  loop
    select c.id into new_city from public.cities c
    where c.country_id = s.country_id and c.name = s.name and c.region_id = s.region_id;
    if new_city is null then
      base := private.slugify(s.name) || '-' || lower(s.code);
      new_slug := base;
      n := 1;
      while exists (select 1 from public.cities c where c.country_id = s.country_id and c.slug = new_slug) loop
        n := n + 1;
        new_slug := base || '-' || n;
      end loop;
      insert into public.cities (country_id, region_id, name, slug)
      values (s.country_id, s.region_id, s.name, new_slug)
      returning id into new_city;
    end if;
    update public.agencies a set city_id = new_city where a.id = any (s.agency_ids) and a.city_id = s.city_id;
    new_city := null;
  end loop;
end
$$;

-- "Middle City East" and "Middle City West" are parts of Center City,
-- Philadelphia.
update public.agencies a set city_id = p.id
from public.cities p
where p.id = 2851 and a.city_id in (2704, 2705);
insert into public.city_aliases (country_id, alias_slug, city_id)
select c.country_id, c.slug, 2851 from public.cities c where c.id in (2704, 2705)
on conflict do nothing;
delete from public.cities c where c.id in (2704, 2705)
  and not exists (select 1 from public.agencies a where a.city_id = c.id);

-- Washington, D.C. is named "Washington" with the state DC, so it shows as
-- "Washington, DC". The "Washington" city keeps only the agency Google found
-- in Washington, North Carolina; the two it could not place move to DC.
update public.cities set name = 'Washington' where id = 3104;
insert into public.city_aliases (country_id, alias_slug, city_id)
select c.country_id, v.alias, 3104 from public.cities c,
  (values ('washington-dc'), ('washington-d-c'), ('district-of-columbia')) v (alias)
where c.id = 3104
on conflict do nothing;
update public.agencies set city_id = 3104
where city_id = 3102 and id in ('28445d26-afbf-4fe6-9335-2561a461be7a', 'a102a344-72b7-4c75-9f45-aac7743417c2');

-- futureconcern.ca is in London, Ontario, not a London in the United States.
update public.agencies a set country_id = c.country_id, city_id = c.id
from public.cities c
where c.id = 286 and a.id = 'b86a6110-170b-4036-8ec2-538109363d2c' and a.city_id = 2637;
