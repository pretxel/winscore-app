/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/winscore_wager.json`.
 */
export type WinscoreWager = {
  "address": "9q5fBczvg3XYipRmxY5tt3axGgNQfYtGeaDpbMHMLkmi",
  "metadata": {
    "name": "winscoreWager",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "cancelAndRefund",
      "discriminator": [
        86,
        34,
        75,
        82,
        239,
        186,
        2,
        228
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Can be the round authority (authorized cancel) or anyone (permissionless timeout)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "wagerRound",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "winner",
          "writable": true,
          "signer": true
        },
        {
          "name": "wagerRound",
          "writable": true
        },
        {
          "name": "claim",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  108,
                  97,
                  105,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "wagerRound"
              },
              {
                "kind": "account",
                "path": "winner"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "wagerRound"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "wagerRound.approvedMint",
                "account": "wagerRound"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "winnerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "proof",
          "type": {
            "vec": {
              "array": [
                "u8",
                32
              ]
            }
          }
        }
      ]
    },
    {
      "name": "close",
      "discriminator": [
        98,
        165,
        201,
        177,
        108,
        65,
        206,
        96
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "wagerRound",
          "writable": true
        },
        {
          "name": "rentRecipientA",
          "writable": true
        },
        {
          "name": "rentRecipientB",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "wagerRound"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "wagerRound.approvedMint",
                "account": "wagerRound"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "enter",
      "discriminator": [
        139,
        49,
        209,
        114,
        88,
        91,
        77,
        134
      ],
      "accounts": [
        {
          "name": "entrant",
          "writable": true,
          "signer": true
        },
        {
          "name": "wagerRound",
          "writable": true
        },
        {
          "name": "entry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "wagerRound"
              },
              {
                "kind": "account",
                "path": "entrant"
              }
            ]
          }
        },
        {
          "name": "entrantTokenAccount",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "wagerRound"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "approvedMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "approvedMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "stakeBaseUnits",
          "type": "u64"
        },
        {
          "name": "pickCommitment",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "intentHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initializeWagerRound",
      "discriminator": [
        33,
        19,
        81,
        247,
        56,
        249,
        125,
        217
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "wagerRound",
          "writable": true
        },
        {
          "name": "approvedMint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "wagerRound"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "approvedMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "rentRecipientA",
          "docs": [
            "First recipient for rent return on close"
          ]
        },
        {
          "name": "rentRecipientB",
          "docs": [
            "Second recipient for rent return on close"
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "groupId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "roundId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "closesAt",
          "type": "i64"
        },
        {
          "name": "refundTimeout",
          "type": "i64"
        },
        {
          "name": "maxParticipants",
          "type": "u16"
        },
        {
          "name": "maxTotalStake",
          "type": "u64"
        },
        {
          "name": "settlementAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "lock",
      "discriminator": [
        21,
        19,
        208,
        43,
        237,
        62,
        255,
        87
      ],
      "accounts": [
        {
          "name": "wagerRound",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "refund",
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "entrant",
          "writable": true,
          "signer": true
        },
        {
          "name": "wagerRound"
        },
        {
          "name": "entry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  110,
                  116,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "wagerRound"
              },
              {
                "kind": "account",
                "path": "entrant"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "wagerRound"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "wagerRound.approvedMint",
                "account": "wagerRound"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "entrantTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "settle",
      "discriminator": [
        175,
        42,
        185,
        87,
        144,
        131,
        102,
        212
      ],
      "accounts": [
        {
          "name": "settlementAuthority",
          "signer": true
        },
        {
          "name": "wagerRound",
          "writable": true
        },
        {
          "name": "vault"
        }
      ],
      "args": [
        {
          "name": "manifestHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "merkleRoot",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "winnerCount",
          "type": "u16"
        },
        {
          "name": "totalDistributable",
          "type": "u64"
        }
      ]
    },
    {
      "name": "shortenClose",
      "discriminator": [
        95,
        140,
        205,
        21,
        239,
        165,
        62,
        89
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "wagerRound",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newClosesAt",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "claim",
      "discriminator": [
        155,
        70,
        22,
        176,
        123,
        215,
        246,
        102
      ]
    },
    {
      "name": "entry",
      "discriminator": [
        63,
        18,
        152,
        113,
        215,
        246,
        221,
        250
      ]
    },
    {
      "name": "wagerRound",
      "discriminator": [
        135,
        106,
        114,
        169,
        253,
        53,
        43,
        109
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6001,
      "name": "notInitialized",
      "msg": "Round is not in initialized state"
    },
    {
      "code": 6002,
      "name": "notLocked",
      "msg": "Round is not locked"
    },
    {
      "code": 6003,
      "name": "alreadySettled",
      "msg": "Round is already settled"
    },
    {
      "code": 6004,
      "name": "notSettled",
      "msg": "Round is not settled"
    },
    {
      "code": 6005,
      "name": "roundCancelled",
      "msg": "Round is cancelled"
    },
    {
      "code": 6006,
      "name": "entryClosed",
      "msg": "Entry period has closed"
    },
    {
      "code": 6007,
      "name": "participantLimitReached",
      "msg": "Participant limit reached"
    },
    {
      "code": 6008,
      "name": "stakeTotalLimitReached",
      "msg": "Stake total limit reached"
    },
    {
      "code": 6009,
      "name": "invalidMint",
      "msg": "Invalid mint"
    },
    {
      "code": 6010,
      "name": "invalidTokenProgram",
      "msg": "Invalid token program"
    },
    {
      "code": 6011,
      "name": "invalidDecimals",
      "msg": "Invalid decimals"
    },
    {
      "code": 6012,
      "name": "invalidStakeAmount",
      "msg": "Invalid stake amount"
    },
    {
      "code": 6013,
      "name": "invalidMerkleProof",
      "msg": "Invalid Merkle proof"
    },
    {
      "code": 6014,
      "name": "claimAlreadyProcessed",
      "msg": "Claim already processed"
    },
    {
      "code": 6015,
      "name": "entryAlreadySettled",
      "msg": "Entry already settled"
    },
    {
      "code": 6016,
      "name": "entryAlreadyRefunded",
      "msg": "Entry already refunded"
    },
    {
      "code": 6017,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6018,
      "name": "closeExtensionForbidden",
      "msg": "Close can only reduce pre-settlement close"
    },
    {
      "code": 6019,
      "name": "conservationViolation",
      "msg": "Deposits must equal claims plus refunds plus liability"
    },
    {
      "code": 6020,
      "name": "distributableMismatch",
      "msg": "Total distributable must equal pot total"
    },
    {
      "code": 6021,
      "name": "vaultNotEmpty",
      "msg": "Vault has outstanding balance"
    },
    {
      "code": 6022,
      "name": "duplicateEntry",
      "msg": "Duplicate entry"
    },
    {
      "code": 6023,
      "name": "settlementAlreadyRecorded",
      "msg": "Settlement already recorded"
    },
    {
      "code": 6024,
      "name": "notRefundable",
      "msg": "Not eligible for refund"
    },
    {
      "code": 6025,
      "name": "refundNotAvailable",
      "msg": "Round must be cancelled or timed out for refund"
    }
  ],
  "types": [
    {
      "name": "claim",
      "docs": [
        "Per-winner claim account.",
        "PDA seeded with wager_round + winner wallet. Prevents double claims."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wagerRound",
            "type": "pubkey"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "claimState"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "claimState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "claimed"
          }
        ]
      }
    },
    {
      "name": "entry",
      "docs": [
        "Per-entrant entry account.",
        "Created by the participant when entering. Stores the pick commitment and wallet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wagerRound",
            "type": "pubkey"
          },
          {
            "name": "entrant",
            "type": "pubkey"
          },
          {
            "name": "pickCommitment",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "intentHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "entryState"
              }
            }
          },
          {
            "name": "entryPda",
            "type": "pubkey"
          },
          {
            "name": "stakeBaseUnits",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "entryState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "settled"
          },
          {
            "name": "refunded"
          }
        ]
      }
    },
    {
      "name": "wagerRound",
      "docs": [
        "Core wager round account.",
        "Stores configuration, stake info, state machine, and authorities."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "groupId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "roundId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "settlementAuthority",
            "type": "pubkey"
          },
          {
            "name": "approvedMint",
            "type": "pubkey"
          },
          {
            "name": "approvedTokenProgram",
            "type": "pubkey"
          },
          {
            "name": "verifiedDecimals",
            "type": "u8"
          },
          {
            "name": "stakeBaseUnits",
            "type": "u64"
          },
          {
            "name": "closesAt",
            "type": "i64"
          },
          {
            "name": "refundTimeout",
            "type": "i64"
          },
          {
            "name": "potTotal",
            "type": "u64"
          },
          {
            "name": "participantCount",
            "type": "u16"
          },
          {
            "name": "maxParticipants",
            "type": "u16"
          },
          {
            "name": "maxTotalStake",
            "type": "u64"
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "wagerRoundState"
              }
            }
          },
          {
            "name": "manifestHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "merkleRoot",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "winnerCount",
            "type": "u16"
          },
          {
            "name": "totalDistributable",
            "type": "u64"
          },
          {
            "name": "rentRecipientA",
            "type": "pubkey"
          },
          {
            "name": "rentRecipientB",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "wagerRoundState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "initialized"
          },
          {
            "name": "locked"
          },
          {
            "name": "settled"
          },
          {
            "name": "cancelled"
          },
          {
            "name": "closed"
          }
        ]
      }
    }
  ]
};
