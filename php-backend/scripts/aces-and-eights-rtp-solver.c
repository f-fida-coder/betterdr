/*
 * aces-and-eights-rtp-solver.c — EXACT optimal-play RTP for the Aces & Eights
 * video poker paytable shipped in frontend/public/games/aces-and-eights.
 *
 * Method (exact, no sampling): for every hold decision the expected value is
 * a sum of final-hand pays over draws from the 47 unseen cards. Those sums
 * are computed by inclusion-exclusion over the discarded cards, using
 * precomputed per-pay-class hand counts S_k(T) = #{5-card hands ⊇ T of class
 * c} for every card subset T with |T| <= 4 (one pass over all C(52,5) =
 * 2,598,960 hands builds them). Per dealt hand the solver evaluates all 32
 * hold masks exactly and keeps the best EV — separately per pay vector,
 * because the max-coin royal (2000/5 = 400 per coin vs 125) shifts optimal
 * strategy near royal draws.
 *
 * Self-validation: --validate runs the full-pay 9/6 Jacks or Better table,
 * which must reproduce the published 99.5439% before any A&8 number is
 * trusted.
 *
 * Build:  cc -O2 -o /tmp/a8rtp aces-and-eights-rtp-solver.c
 * Run:    /tmp/a8rtp            (A&8 table, coin levels 1-4 and 5)
 *         /tmp/a8rtp --validate (9/6 JoB check)
 */
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

/* Pay classes, in the game's own terms. */
enum {
    CL_NONE = 0, CL_JB, CL_2P, CL_3K, CL_ST, CL_FL, CL_FH,
    CL_4K,   /* quads 2-6, 9-K */
    CL_47,   /* quad sevens    */
    CL_SF,
    CL_A8,   /* quad aces or eights */
    CL_NR,
    N_CLASS
};

/* Card c in 0..51: rank = c % 13 (0='2' .. 8='T', 9='J', 10='Q', 11='K',
 * 12='A'), suit = c / 13. */
static inline int rank_of(int c) { return c % 13; }
static inline int suit_of(int c) { return c / 13; }

/* Classify a 5-card hand given as card indices. */
static int classify(const int h[5])
{
    int counts[13] = {0};
    int rankmask = 0;
    int flush = 1;
    for (int i = 0; i < 5; i++) {
        counts[rank_of(h[i])]++;
        rankmask |= 1 << rank_of(h[i]);
        if (suit_of(h[i]) != suit_of(h[0])) flush = 0;
    }

    int quad = -1, trip = -1, pairs = 0, pair_rank = -1;
    for (int r = 0; r < 13; r++) {
        if (counts[r] == 4) quad = r;
        else if (counts[r] == 3) trip = r;
        else if (counts[r] == 2) { pairs++; pair_rank = r; }
    }

    /* Straight: 5 consecutive rank bits, or the wheel A-2-3-4-5. */
    int straight_high = -1; /* rank index of the high card, 12 = ace-high */
    if (quad < 0 && trip < 0 && pairs == 0) {
        for (int lo = 0; lo <= 8; lo++) {
            if ((rankmask & (0x1F << lo)) == (0x1F << lo)) { straight_high = lo + 4; break; }
        }
        if (straight_high < 0 && rankmask == ((1 << 12) | 0xF)) straight_high = 3; /* A2345 */
    }

    if (straight_high >= 0 && flush) return straight_high == 12 ? CL_NR : CL_SF;
    if (quad >= 0) {
        if (quad == 12 || quad == 6) return CL_A8; /* aces (12) or eights (6) */
        if (quad == 5) return CL_47;               /* sevens */
        return CL_4K;
    }
    if (trip >= 0 && pairs == 1) return CL_FH;
    if (flush) return CL_FL;
    if (straight_high >= 0) return CL_ST;
    if (trip >= 0) return CL_3K;
    if (pairs == 2) return CL_2P;
    if (pairs == 1 && pair_rank >= 9) return CL_JB; /* J,Q,K,A */
    return CL_NONE;
}

/* Combinatorial ranking tables: C(n,k) and subset indices. */
static long long C[53][6];
static void build_binom(void)
{
    for (int n = 0; n <= 52; n++) {
        C[n][0] = 1;
        for (int k = 1; k <= 5; k++)
            C[n][k] = (n == 0) ? 0 : C[n - 1][k - 1] + C[n - 1][k];
    }
}
/* Index of a sorted k-subset in colex order. */
static inline long long subset_index(const int *s, int k)
{
    long long idx = 0;
    for (int i = 0; i < k; i++) idx += C[s[i]][i + 1];
    return idx;
}

/* Per-class counts for hands containing a fixed subset.
 * S1: 52 entries, S2: C(52,2)=1326, S3: C(52,3)=22100, S4: C(52,4)=270725.
 * Stored as uint32 per class (max count C(51,4)=249900 fits easily). */
static uint32_t *S1, *S2, *S3, *S4;
static uint64_t S0[N_CLASS];

static void accumulate_tables(void)
{
    S1 = calloc((size_t)52     * N_CLASS, sizeof(uint32_t));
    S2 = calloc((size_t)1326   * N_CLASS, sizeof(uint32_t));
    S3 = calloc((size_t)22100  * N_CLASS, sizeof(uint32_t));
    S4 = calloc((size_t)270725 * N_CLASS, sizeof(uint32_t));
    if (!S1 || !S2 || !S3 || !S4) { fprintf(stderr, "alloc failed\n"); exit(1); }

    int h[5];
    for (h[4] = 4; h[4] < 52; h[4]++)
    for (h[3] = 3; h[3] < h[4]; h[3]++)
    for (h[2] = 2; h[2] < h[3]; h[2]++)
    for (h[1] = 1; h[1] < h[2]; h[1]++)
    for (h[0] = 0; h[0] < h[1]; h[0]++) {
        int cl = classify(h);
        S0[cl]++;
        int sub[4];
        for (int a = 0; a < 5; a++) {
            S1[(size_t)h[a] * N_CLASS + cl]++;
            for (int b = a + 1; b < 5; b++) {
                sub[0] = h[a]; sub[1] = h[b];
                S2[(size_t)subset_index(sub, 2) * N_CLASS + cl]++;
                for (int c = b + 1; c < 5; c++) {
                    sub[2] = h[c];
                    S3[(size_t)subset_index(sub, 3) * N_CLASS + cl]++;
                    for (int d = c + 1; d < 5; d++) {
                        sub[3] = h[d];
                        S4[(size_t)subset_index(sub, 4) * N_CLASS + cl]++;
                    }
                }
            }
        }
    }
}

/* Fetch per-class counts of 5-card hands containing sorted subset s (|s|=k). */
static inline const uint32_t *table_row(const int *s, int k)
{
    switch (k) {
        case 1: return &S1[(size_t)s[0] * N_CLASS];
        case 2: return &S2[(size_t)subset_index(s, 2) * N_CLASS];
        case 3: return &S3[(size_t)subset_index(s, 3) * N_CLASS];
        case 4: return &S4[(size_t)subset_index(s, 4) * N_CLASS];
        default: return NULL;
    }
}

/* Best hold mask for a dealt 5-card hand under pay vector `pay` — the exact
 * optimal decision (max EV over the 47 unseen), same inclusion-exclusion the
 * exhaustive scan uses. Returns the mask; *outEV set to its EV. Used by the
 * bias-gate Monte-Carlo so its "optimal player" is identical to the solver. */
static int best_hold_mask(const int h[5], const double pay[N_CLASS], double *outEV)
{
    int bestMask = 0;
    double bestEV = -1.0;
    for (int mask = 0; mask < 32; mask++) {
        int held[5], disc[5], nh = 0, nd = 0;
        for (int i = 0; i < 5; i++) {
            if (mask & (1 << i)) held[nh++] = h[i];
            else disc[nd++] = h[i];
        }
        double cls[N_CLASS] = {0};
        if (nd == 0) {
            cls[classify(h)] = 1.0;
        } else {
            for (int t = 0; t < (1 << nd); t++) {
                int s[5], k = 0;
                for (int i = 0; i < nh; i++) s[k++] = held[i];
                for (int i = 0; i < nd; i++) if (t & (1 << i)) s[k++] = disc[i];
                for (int i = 1; i < k; i++) {
                    int v = s[i], j = i - 1;
                    while (j >= 0 && s[j] > v) { s[j + 1] = s[j]; j--; }
                    s[j + 1] = v;
                }
                int sign = (__builtin_popcount(t) & 1) ? -1 : 1;
                if (k == 0) { for (int c = 0; c < N_CLASS; c++) cls[c] += sign * (double)S0[c]; }
                else if (k == 5) { cls[classify(s)] += sign; }
                else { const uint32_t *row = table_row(s, k); for (int c = 0; c < N_CLASS; c++) cls[c] += sign * (double)row[c]; }
            }
            double denom = (double)C[47][nd];
            for (int c = 0; c < N_CLASS; c++) cls[c] /= denom;
        }
        double ev = 0.0;
        for (int c = 0; c < N_CLASS; c++) ev += cls[c] * pay[c];
        if (ev > bestEV) { bestEV = ev; bestMask = mask; }
    }
    if (outEV) *outEV = bestEV;
    return bestMask;
}

/* Bias-gate Monte-Carlo: read seeded 52-card decks (one line each, 52 space-
 * separated ints 1..52) produced by the PHP seeded shuffle, play the exact
 * optimal hold, draw the replacements from the SAME seeded deck (positions 5+
 * in order), classify, and tally realized RTP separately for the coins-1-4 and
 * coin-5 pay vectors. If the seeded shuffle is unbiased this converges to the
 * exhaustive optimal-play RTP (96.247% / 96.796%). Any drift = shuffle bias. */
static int run_sim(const char *path, const double payA[N_CLASS], const double payB[N_CLASS])
{
    FILE *f = fopen(path, "r");
    if (!f) { fprintf(stderr, "cannot open %s\n", path); return 1; }
    double retA = 0.0, retB = 0.0;
    long long rounds = 0;
    int deck[52];
    for (;;) {
        int got = 0;
        for (int i = 0; i < 52; i++) {
            if (fscanf(f, "%d", &deck[i]) != 1) { got = -1; break; }
            got++;
        }
        if (got != 52) break;
        /* 0-based card codes for classify(): the file uses the engine's 1..52
         * codes (rank=(n-1)%13, suit=(n-1)/13); classify() wants 0..51. */
        int h[5];
        for (int i = 0; i < 5; i++) h[i] = deck[i] - 1;

        /* coins 1-4 vector */
        int maskA = best_hold_mask(h, payA, NULL);
        int finalA[5]; int ptr = 5;
        for (int i = 0; i < 5; i++) finalA[i] = (maskA & (1 << i)) ? h[i] : (deck[ptr++] - 1);
        retA += payA[classify(finalA)];

        /* coin 5 vector (royal jump shifts some near-royal holds) */
        int maskB = best_hold_mask(h, payB, NULL);
        int finalB[5]; ptr = 5;
        for (int i = 0; i < 5; i++) finalB[i] = (maskB & (1 << i)) ? h[i] : (deck[ptr++] - 1);
        retB += payB[classify(finalB)];

        if ((++rounds % 500000) == 0) fprintf(stderr, "  %lld rounds…\n", rounds);
    }
    fclose(f);
    if (rounds == 0) { fprintf(stderr, "no decks read\n"); return 1; }
    /* 1 coin bet per coin-level; RTP = mean per-coin return. */
    printf("bias-gate Monte-Carlo over %lld seeded decks:\n", rounds);
    printf("  coins 1-4 realized RTP: %.4f%%  (exhaustive optimal: 96.2474%%)\n", 100.0 * retA / (double)rounds);
    printf("  coin 5   realized RTP: %.4f%%  (exhaustive optimal: 96.7963%%)\n", 100.0 * retB / (double)rounds);
    return 0;
}

int main(int argc, char **argv)
{
    int validate = argc > 1 && strcmp(argv[1], "--validate") == 0;
    int simMode = argc > 2 && strcmp(argv[1], "--simfile") == 0;

    /* Per-coin pay vectors. A&8: royal is 125/coin at 1-4 coins, 400/coin at
     * max bet (2000 for 5 coins). Everything else scales linearly. */
    double payA[N_CLASS] = {0}; /* coins 1-4 */
    double payB[N_CLASS] = {0}; /* coin 5    */
    if (validate) {
        /* 9/6 Jacks or Better, max-coin (royal 800/coin): published 99.5439% */
        double p[N_CLASS] = {0, 1, 2, 3, 4, 6, 9, 25, 25, 50, 25, 800};
        memcpy(payA, p, sizeof p);
        memcpy(payB, p, sizeof p);
    } else if (argc >= 14 && strcmp(argv[1], "--table") == 0) {
        /* --table JB 2P 3K ST FL FH 4K 47 SF A8 NRbase NRmax
         * (12 per-coin-base multipliers; NRmax is the FULL max-coin royal so
         * its per-coin value is NRmax/5). Lets the exact solver evaluate any
         * admin paytable at the config corners. */
        double base[11];
        for (int i = 0; i < 11; i++) base[i] = atof(argv[2 + i]);
        double nrMax = atof(argv[13]);
        double a[N_CLASS] = {0, base[0], base[1], base[2], base[3], base[4], base[5], base[6], base[7], base[8], base[9], base[10]};
        double b[N_CLASS] = {0, base[0], base[1], base[2], base[3], base[4], base[5], base[6], base[7], base[8], base[9], nrMax / 5.0};
        memcpy(payA, a, sizeof a);
        memcpy(payB, b, sizeof b);
    } else {
        double a[N_CLASS] = {0, 1, 2, 3, 4, 5, 7, 20, 50, 50, 80, 125};
        double b[N_CLASS] = {0, 1, 2, 3, 4, 5, 7, 20, 50, 50, 80, 400};
        memcpy(payA, a, sizeof a);
        memcpy(payB, b, sizeof b);
    }

    build_binom();
    fprintf(stderr, "building subset tables (one pass over C(52,5))...\n");
    accumulate_tables();

    if (simMode) {
        /* payA/payB were set to the A&8 default table above unless --table was
         * given; the bias gate runs the DEFAULT table (the RTP under test). */
        return run_sim(argv[2], payA, payB);
    }

    fprintf(stderr, "tables done, scanning deals...\n");

    double totalA = 0.0, totalB = 0.0;
    /* Expected per-class contribution under optimal play (pay vector B). */
    double classContribB[N_CLASS] = {0};

    int h[5];
    long long done = 0;
    for (h[4] = 4; h[4] < 52; h[4]++)
    for (h[3] = 3; h[3] < h[4]; h[3]++)
    for (h[2] = 2; h[2] < h[3]; h[2]++)
    for (h[1] = 1; h[1] < h[2]; h[1]++)
    for (h[0] = 0; h[0] < h[1]; h[0]++) {
        double bestA = -1.0, bestB = -1.0;
        double bestBClass[N_CLASS];

        for (int mask = 0; mask < 32; mask++) {
            int held[5], disc[5], nh = 0, nd = 0;
            for (int i = 0; i < 5; i++) {
                if (mask & (1 << i)) held[nh++] = h[i];
                else disc[nd++] = h[i];
            }

            double cls[N_CLASS] = {0};
            if (nd == 0) {
                /* hold all: the dealt hand itself */
                cls[classify(h)] = 1.0;
            } else {
                /* Inclusion-exclusion over subsets T of the discards:
                 * #hands ⊇ held, avoiding discards, per class. */
                for (int t = 0; t < (1 << nd); t++) {
                    int s[5], k = 0;
                    for (int i = 0; i < nh; i++) s[k++] = held[i];
                    for (int i = 0; i < nd; i++) if (t & (1 << i)) s[k++] = disc[i];
                    /* sort the ≤5 small array (insertion) */
                    for (int i = 1; i < k; i++) {
                        int v = s[i], j = i - 1;
                        while (j >= 0 && s[j] > v) { s[j + 1] = s[j]; j--; }
                        s[j + 1] = v;
                    }
                    int sign = (__builtin_popcount(t) & 1) ? -1 : 1;
                    if (k == 0) {
                        for (int c = 0; c < N_CLASS; c++) cls[c] += sign * (double)S0[c];
                    } else if (k == 5) {
                        cls[classify(s)] += sign;
                    } else {
                        const uint32_t *row = table_row(s, k);
                        for (int c = 0; c < N_CLASS; c++) cls[c] += sign * (double)row[c];
                    }
                }
                double denom = (double)C[47][nd];
                for (int c = 0; c < N_CLASS; c++) cls[c] /= denom;
            }

            double evA = 0.0, evB = 0.0;
            for (int c = 0; c < N_CLASS; c++) { evA += cls[c] * payA[c]; evB += cls[c] * payB[c]; }
            if (evA > bestA) bestA = evA;
            if (evB > bestB) { bestB = evB; memcpy(bestBClass, cls, sizeof cls); }
        }

        totalA += bestA;
        totalB += bestB;
        for (int c = 0; c < N_CLASS; c++) classContribB[c] += bestBClass[c];

        if ((++done & 0xFFFFF) == 0) fprintf(stderr, "  %lld / 2598960 deals\n", done);
    }

    double nDeals = (double)C[52][5];
    printf("deals scanned: %lld (expected 2598960)\n", done);
    if (validate) {
        printf("9/6 Jacks or Better optimal RTP: %.6f%%  (published: 99.543904%%)\n",
               100.0 * totalB / nDeals);
        return 0;
    }

    printf("\nAces & Eights (captured paytable) EXACT optimal-play RTP:\n");
    printf("  coins 1-4 (royal 125/coin): %.6f%%\n", 100.0 * totalA / nDeals);
    printf("  coins 5   (royal 400/coin): %.6f%%\n", 100.0 * totalB / nDeals);

    static const char *names[N_CLASS] = {
        "nothing", "jacks-or-better", "two pair", "trips", "straight",
        "flush", "full house", "quads 2-6,9-K", "quad 7s", "straight flush",
        "quad A/8", "natural royal"
    };
    printf("\nper-class expected frequency + pay contribution (max-coin strategy):\n");
    double payB2[N_CLASS];
    memcpy(payB2, payB, sizeof payB2);
    for (int c = 0; c < N_CLASS; c++) {
        double freq = classContribB[c] / nDeals;
        printf("  %-16s freq=%.8f  contribution=%.6f%%\n",
               names[c], freq, 100.0 * freq * payB2[c]);
    }
    return 0;
}
