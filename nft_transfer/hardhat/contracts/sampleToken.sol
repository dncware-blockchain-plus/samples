// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// 他のファイルの内容をインポート
import "../receiver/Types.sol";

contract SampleToken is ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Burnable, Ownable {
    uint256 private _nextTokenId;

    constructor(address initialOwner)
        ERC721("SampleToken", "STK")
        Ownable(initialOwner)
    {}

    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    //// NFT転送での転送元の追跡のための独自拡張

    mapping(uint256 => Types.TokenOrigin) private tokenOrigins;

    // トークンを mint し、転送元の情報を保存する関数
    function safeMintWithOrigin(address to, string memory uri, Types.TokenOrigin memory origin) public onlyOwner {
        
        // トークンを mint
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        // 転送元の情報を保存
        tokenOrigins[tokenId] = origin;
    }

    // 指定されたトークンIDの転送元情報を取得する関数
    function getTokenOrigin(uint256 tokenId) public view returns (Types.TokenOrigin memory) {
        Types.TokenOrigin storage origin = tokenOrigins[tokenId];
        require(bytes(origin.srcChainInfoId).length > 0, "Token does not exist");
        return origin;
    }
}
