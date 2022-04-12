import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Row, Col, Card } from 'react-bootstrap';

function renderSoldItems(items) {
  return (
    <>
      <h2>Sold</h2>
      <Row xs={1} md={2} lg={4} className="g-4 py-3">
        {items.map((item, idx) => (
          <Col key={idx} className="overflow-hidden">
            <Card>
              <Card.Img variant="top" src={item.image} />
              <Card.Footer>
                For {ethers.utils.formatEther(item.totalPrice)} ETH - Recieved {ethers.utils.formatEther(item.price)} ETH
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

export default function MyListedItems({ marketplace, nft, account }) {
  const [loading, setLoading] = useState(true);
  const [listedItems, setListedItems] = useState([]);
  const [soldItems, setSoldItems] = useState([]);

  // Load all sold items that the user listed
  const loadListedItems = async () => {
    let listedItems = [];
    let soldItems = [];

    // SOLUTION 1 - get marketplace items list
    // const itemCount = await marketplace.itemCount();
    // for (let indx = 1; indx <= itemCount; indx++) {
    //   const i = await marketplace.items(indx);
    //   if (i.seller.toLowerCase() === account) {
    //     // get uri url from nft contract
    //     const uri = await nft.tokenURI(i.tokenId);
    //     // use uri to fetch the nft metadata stored on ipfs 
    //     const response = await fetch(uri);
    //     const metadata = await response.json();
    //     // get total price of item (item price + fee)
    //     const totalPrice = await marketplace.getTotalPrice(i.itemId);
    //     // define listed item object
    //     let item = {
    //       totalPrice,
    //       price: i.price,
    //       itemId: i.itemId,
    //       name: metadata.name,
    //       description: metadata.description,
    //       image: metadata.image
    //     };
    //     listedItems.push(item);
    //     // Add listed item to sold items array if sold
    //     if (i.sold) soldItems.push(item);
    //   }
    // }

    // SOLUTION 2 - query Offered events with the seller set as the user
    const filter = marketplace.filters.Offered(null, null, null, null, account);
    const results = await marketplace.queryFilter(filter);
    listedItems = await Promise.all(results.map(async i => {
        i = i.args;
        const uri = await nft.tokenURI(i.tokenId);
        const response = await fetch(uri);
        const metadata = await response.json();
        const totalPrice = await marketplace.getTotalPrice(i.itemId);
        const item = {
            totalPrice,
            price: i.price,
            itemId: i.itemId,
            name: metadata.name,
            description: metadata.description,
            image: metadata.image
        };
        // sold property is not part of Offered event, so item needs to be fetched from the contract
        const fullItemData = await marketplace.items(i.itemId);
        if (fullItemData.sold) soldItems.push(item);
        return item;
    }));

    setLoading(false);
    setListedItems(listedItems);
    setSoldItems(soldItems);
  }
  useEffect(() => {
    loadListedItems()
  }, []);

  if (loading) return (
    <main style={{ padding: "1rem 0" }}>
      <h2>Loading...</h2>
    </main>
  )

  return (
    <div className="flex justify-center">
      {listedItems.length > 0 ?
        <div className="px-5 py-3 container">
            <h2>Listed</h2>
          <Row xs={1} md={2} lg={4} className="g-4 py-3">
            {listedItems.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Footer>{ethers.utils.formatEther(item.totalPrice)} ETH</Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
            {soldItems.length > 0 && renderSoldItems(soldItems)}
        </div>
        : (
          <main style={{ padding: "1rem 0" }}>
            <h2>No listed assets</h2>
          </main>
        )}
    </div>
  );
};