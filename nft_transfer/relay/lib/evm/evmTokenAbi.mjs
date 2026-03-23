// EVMのNFTコントラクトのABI
// 以下の関数のみを定義：
// - balanceOf(address owner) : 指定されたアドレスが保有するトークン数を返す。
// - tokenOfOwnerByIndex(address owner, uint256 index) : 指定されたアドレスが保有するトークンのうち、index番目のトークンIDを返す。
// - tokenURI(uint256 tokenId) : 指定されたトークンIDのメタデータURIを返す。

'use strict';

export const evmTokenAbi = [
    {
        inputs: [
            {
                'internalType': 'address',
                'name': 'owner',
                'type': 'address'
            }
        ],
        name: 'balanceOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'owner',
          type: 'address'
        },
        {
          internalType: 'uint256',
          name: 'index',
          type: 'uint256'
        }
      ],
      name: 'tokenOfOwnerByIndex',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256'
        }
      ],
      stateMutability: 'view',
      type: 'function'
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256'
            }
        ],
        name: 'tokenURI',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string'
            }
        ],
        stateMutability: 'view',
        type: 'function'
    },
    {
      inputs: [
        {
          internalType: 'uint256',
          name: 'tokenId',
          type: 'uint256'
        }
      ],
      name: 'getTokenOrigin',
      outputs: [
        {
          components: [
            {
              internalType: 'string',
              name: 'srcChainInfoId',
              type: 'string'
            },
            {
              internalType: 'string',
              name: 'srcNFTId',
              type: 'string'
            },
            {
              internalType: 'string',
              name: 'orgTokenId',
              type: 'string'
            }
          ],
          internalType: 'struct Types.TokenOrigin',
          name: '',
          type: 'tuple'
        }
      ],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: 'to',
          type: 'address'
        },
        {
          internalType: 'uint256',
          name: 'tokenId',
          type: 'uint256'
        }
      ],
      name: 'approve',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function'
    }
];
